# API INTEGRATION - OpenAPI Spec Parsing

## Overview

Contour supports OpenAPI 3.0.x, 3.1.x, and Swagger 2.0 specifications. This document explains how specs are loaded, parsed, validated, and converted to mock endpoints.

---

## Supported Spec Formats

### OpenAPI 3.1.x (Recommended)
```yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
      required: [id, email, name]
```

### OpenAPI 3.0.x
```yaml
openapi: 3.0.3
# Same structure as 3.1.x
```

### Swagger 2.0 (Legacy Support)
```yaml
swagger: "2.0"
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      produces:
        - application/json
      responses:
        200:
          description: List of users
          schema:
            type: array
            items:
              $ref: '#/definitions/User'
definitions:
  User:
    type: object
    properties:
      id:
        type: string
      email:
        type: string
      name:
        type: string
```

**Note:** Swagger 2.0 is automatically converted to OpenAPI 3.x internally using `swagger2openapi` library.

---

## Spec Loading Process

### 1. Input Detection
```typescript
// src/loader/index.ts
export async function loadSpec(input: string): Promise<OpenAPISpec> {
  if (isURL(input)) {
    return loadFromURL(input);
  } else if (isFilePath(input)) {
    return loadFromFile(input);
  } else {
    throw new InvalidInputError(`Invalid spec input: ${input}`);
  }
}

function isURL(input: string): boolean {
  return /^https?:\/\//.test(input);
}

function isFilePath(input: string): boolean {
  return input.endsWith('.yaml') || 
         input.endsWith('.yml') || 
         input.endsWith('.json');
}
```

---

### 2. Remote Spec Fetching
```typescript
// src/loader/fetcher.ts
import axios from 'axios';
import { createHash } from 'crypto';

export async function loadFromURL(url: string): Promise<OpenAPISpec> {
  const cacheKey = generateCacheKey(url);
  const cachedSpec = await getCachedSpec(cacheKey);
  
  if (cachedSpec && !isStale(cachedSpec)) {
    logger.info('Using cached spec', { url, age: cachedSpec.age });
    return cachedSpec.data;
  }
  
  logger.info('Fetching spec from URL', { url });
  
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Contour/1.0.0'
    }
  });
  
  const spec = parseSpec(response.data, url);
  await cacheSpec(cacheKey, spec);
  
  return spec;
}

function generateCacheKey(url: string): string {
  return createHash('md5').update(url).digest('hex');
}
```

**Cache Strategy:**
- Cache location: `~/.contour/cache/`
- Cache TTL: 24 hours (configurable)
- Metadata stored in `metadata.json`
```typescript
// Cache metadata structure
interface CacheMetadata {
  [cacheKey: string]: {
    url: string;
    timestamp: number;
    etag?: string;
    specVersion: string;
  };
}
```

---

### 3. Local File Loading
```typescript
// src/loader/parser.ts
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function loadFromFile(filePath: string): Promise<OpenAPISpec> {
  const absolutePath = path.resolve(filePath);
  
  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return parseSpec(content, absolutePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SpecNotFoundError(absolutePath);
    }
    throw error;
  }
}

export function parseSpec(content: string, source: string): OpenAPISpec {
  const extension = path.extname(source);
  
  let parsed: unknown;
  
  if (extension === '.json') {
    parsed = JSON.parse(content);
  } else if (extension === '.yaml' || extension === '.yml') {
    parsed = yaml.load(content);
  } else {
    // Try JSON first, then YAML
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = yaml.load(content);
    }
  }
  
  return validateAndNormalizeSpec(parsed);
}
```

---

### 4. Spec Validation
```typescript
// src/loader/validator.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import openapi3Schema from 'openapi-schemas/v3.0.json';
import openapi31Schema from 'openapi-schemas/v3.1.json';

const ajv = new Ajv({ strict: false });
addFormats(ajv);

export function validateAndNormalizeSpec(spec: unknown): OpenAPISpec {
  // Check if it's Swagger 2.0
  if (isSwagger2(spec)) {
    logger.info('Converting Swagger 2.0 to OpenAPI 3.x');
    spec = convertSwagger2ToOpenAPI3(spec);
  }
  
  // Determine OpenAPI version
  const version = getOpenAPIVersion(spec);
  
  // Validate against schema
  const schema = version === '3.1' ? openapi31Schema : openapi3Schema;
  const validate = ajv.compile(schema);
  const valid = validate(spec);
  
  if (!valid) {
    throw new InvalidSpecError(
      `Spec validation failed:\n${ajv.errorsText(validate.errors)}`
    );
  }
  
  return spec as OpenAPISpec;
}

function isSwagger2(spec: any): boolean {
  return spec?.swagger === '2.0';
}

function getOpenAPIVersion(spec: any): '3.0' | '3.1' {
  const version = spec?.openapi;
  if (version?.startsWith('3.1')) return '3.1';
  if (version?.startsWith('3.0')) return '3.0';
  throw new InvalidSpecError(`Unsupported OpenAPI version: ${version}`);
}
```

**Validation Checks:**
- ✅ Valid OpenAPI/Swagger version
- ✅ Required fields present (info, paths)
- ✅ Schema references resolve (`$ref`)
- ✅ Response schemas are valid
- ✅ Parameter types are valid
- ⚠️ Warnings for deprecated features
- ⚠️ Warnings for missing descriptions

---

## Path to Route Conversion

### Path Parameters

**OpenAPI:**
```yaml
/users/{userId}/posts/{postId}:
  get:
    parameters:
      - name: userId
        in: path
        required: true
        schema:
          type: string
      - name: postId
        in: path
        required: true
        schema:
          type: string
```

**Generated Express Route:**
```typescript
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  
  // Generate data with these IDs
  const post = generateData(PostSchema, {
    overrides: {
      id: postId,
      userId: userId
    }
  });
  
  res.json(post);
});
```

---

### Query Parameters

**OpenAPI:**
```yaml
/users:
  get:
    parameters:
      - name: role
        in: query
        schema:
          type: string
          enum: [admin, user, guest]
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          default: 10
```

**Generated Handler:**
```typescript
app.get('/users', (req, res) => {
  const { role, page = 1, limit = 10 } = req.query;
  
  let users = getOrGenerateUsers();
  
  // Filter by role if provided
  if (role) {
    users = users.filter(u => u.role === role);
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedUsers = users.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedUsers,
    page: parseInt(page),
    limit: parseInt(limit),
    total: users.length,
    pages: Math.ceil(users.length / limit)
  });
});
```

---

### Request Body Validation

**OpenAPI:**
```yaml
/users:
  post:
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              email:
                type: string
                format: email
              name:
                type: string
                minLength: 2
              age:
                type: integer
                minimum: 18
            required: [email, name]
```

**Validation Implementation:**
```typescript
import Ajv from 'ajv';

const ajv = new Ajv();

app.post('/users', (req, res) => {
  const schema = getRequestBodySchema('POST', '/users');
  const validate = ajv.compile(schema);
  
  if (!validate(req.body)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validate.errors
    });
  }
  
  // In stateful mode, save the user
  if (config.stateful) {
    const user = {
      id: generateUUID(),
      ...req.body,
      created_at: new Date().toISOString()
    };
    state.addUser(user);
    return res.status(201).json(user);
  }
  
  // In non-stateful mode, just echo back with ID
  const user = {
    id: generateUUID(),
    ...req.body,
    created_at: new Date().toISOString()
  };
  res.status(201).json(user);
});
```

---

### Response Schema Resolution

**Schema References:**
```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        profile:
          $ref: '#/components/schemas/Profile'
    
    Profile:
      type: object
      properties:
        bio:
          type: string
        avatar:
          type: string
          format: uri
```

**Resolution Logic:**
```typescript
// src/routes/generator.ts
export function resolveSchema(
  ref: string, 
  spec: OpenAPISpec
): Schema {
  // Parse reference: #/components/schemas/User
  const parts = ref.replace('#/', '').split('/');
  
  let current: any = spec;
  for (const part of parts) {
    current = current[part];
    if (!current) {
      throw new InvalidSpecError(`Cannot resolve reference: ${ref}`);
    }
  }
  
  // Recursively resolve nested refs
  return resolveNestedRefs(current, spec);
}

function resolveNestedRefs(schema: Schema, spec: OpenAPISpec): Schema {
  if (schema.$ref) {
    return resolveSchema(schema.$ref, spec);
  }
  
  if (schema.type === 'object' && schema.properties) {
    const resolved = { ...schema };
    resolved.properties = {};
    
    for (const [key, prop] of Object.entries(schema.properties)) {
      resolved.properties[key] = resolveNestedRefs(prop, spec);
    }
    
    return resolved;
  }
  
  if (schema.type === 'array' && schema.items) {
    return {
      ...schema,
      items: resolveNestedRefs(schema.items, spec)
    };
  }
  
  return schema;
}
```

---

## HTTP Methods Support

### Supported Methods (v1.0)

| Method | Support | Notes |
|--------|---------|-------|
| GET | ✅ Full | Returns generated/cached data |
| POST | ✅ Full | Validates body, returns 201 |
| PUT | ✅ Full | Validates body, returns 200 |
| PATCH | ✅ Full | Validates body, returns 200 |
| DELETE | ✅ Full | Returns 204 or 200 |
| OPTIONS | ✅ Auto | CORS preflight |
| HEAD | ✅ Auto | Same as GET, no body |
| TRACE | ❌ Not needed | Dev tool only |
| CONNECT | ❌ Not needed | Proxy only |

---

### Method-Specific Behavior

**GET:**
- Returns array for collection endpoints (`/users`)
- Returns single object for item endpoints (`/users/{id}`)
- Supports query parameters (filtering, pagination)

**POST:**
- Validates request body
- Generates ID for new resource
- Returns 201 Created
- In stateful mode: adds to state
- In non-stateful mode: just echoes with ID

**PUT:**
- Validates complete request body
- Returns 200 OK
- In stateful mode: replaces resource
- In non-stateful mode: echoes body

**PATCH:**
- Validates partial request body
- Returns 200 OK
- In stateful mode: merges with existing
- In non-stateful mode: echoes merged data

**DELETE:**
- Returns 204 No Content or 200 OK
- In stateful mode: removes from state
- In non-stateful mode: just returns success

---

## Content Type Handling

### Supported Content Types (v1.0)

**Request:**
- ✅ `application/json`
- ❌ `multipart/form-data` (v2.0)
- ❌ `application/xml` (v2.0)

**Response:**
- ✅ `application/json`
- ❌ `application/xml` (v2.0)
- ❌ `text/plain` (v2.0)

**Default Behavior:**
```typescript
app.use(express.json()); // Parse JSON bodies
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});
```

---

## Status Codes

### Default Response Codes
```typescript
const DEFAULT_STATUS_CODES = {
  GET: 200,
  POST: 201,
  PUT: 200,
  PATCH: 200,
  DELETE: 204
};
```

### Error Response Codes
```typescript
const ERROR_STATUS_CODES = {
  VALIDATION_ERROR: 400,      // Invalid request body
  UNAUTHORIZED: 401,          // --require-auth, no token
  NOT_FOUND: 404,             // Endpoint not in spec
  METHOD_NOT_ALLOWED: 405,    // Method not defined for path
  INTERNAL_ERROR: 500,        // --error-rate simulation
  SERVICE_UNAVAILABLE: 503    // Server overload
};
```

### Multiple Response Schemas

**OpenAPI:**
```yaml
/users/{id}:
  get:
    responses:
      '200':
        description: User found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      '404':
        description: User not found
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
```

**Implementation:**
```typescript
app.get('/users/:id', (req, res) => {
  const user = state.getUser(req.params.id);
  
  if (!user) {
    // Return 404 schema
    return res.status(404).json({
      error: 'User not found'
    });
  }
  
  // Return 200 schema
  res.json(user);
});
```

**Note:** In v1.0, we primarily return 200/201 responses. Error responses (404, 400) use simple formats.

---

## Authentication Simulation

### Bearer Token (--require-auth)

**OpenAPI:**
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
security:
  - bearerAuth: []
```

**Implementation:**
```typescript
// src/server/middleware/auth.ts
export function authMiddleware(config: Config) {
  if (!config.requireAuth) {
    return (req, res, next) => next();
  }
  
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }
    
    // In mock mode, any token is valid
    next();
  };
}
```

**Note:** We don't validate token contents in v1.0. Any `Bearer <token>` passes.

---

## Pagination Handling

### Auto-Pagination for Arrays

**When an endpoint returns an array, auto-enable pagination:**
```typescript
function isPaginatableEndpoint(schema: Schema): boolean {
  return schema.type === 'array';
}

app.get('/users', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const allUsers = getOrGenerateUsers();
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedUsers = allUsers.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedUsers,
    pagination: {
      page,
      limit,
      total: allUsers.length,
      pages: Math.ceil(allUsers.length / limit)
    }
  });
});
```

**Override with OpenAPI Extension:**
```yaml
/users:
  get:
    x-contour-pagination: false  # Disable auto-pagination
    responses:
      '200':
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/User'
```

---

## Custom OpenAPI Extensions

### Contour-Specific Extensions

**x-contour-count:**
```yaml
/users:
  get:
    x-contour-count: 20  # Generate 20 users instead of default 5
    responses:
      '200':
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/User'
```

**x-contour-deterministic:**
```yaml
/users/{id}:
  get:
    x-contour-deterministic: true  # Always same data for this ID
```

**x-contour-delay:**
```yaml
/slow-endpoint:
  get:
    x-contour-delay: 2000  # Always 2s delay for this endpoint
```

---

## Example Specs

### Minimal Valid Spec
```yaml
openapi: 3.0.0
info:
  title: Minimal API
  version: 1.0.0
paths:
  /health:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
```

### Complex Real-World Spec
```yaml
openapi: 3.1.0
info:
  title: E-Commerce API
  version: 2.0.0
servers:
  - url: https://api.example.com/v2
paths:
  /products:
    get:
      summary: List products
      parameters:
        - name: category
          in: query
          schema:
            type: string
            enum: [electronics, clothing, books]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Products list
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
    post:
      summary: Create product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
      responses:
        '201':
          description: Product created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
  
  /products/{productId}:
    get:
      summary: Get product
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Product details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '404':
          description: Product not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    Product:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        price:
          type: number
          format: float
          minimum: 0
        category:
          type: string
          enum: [electronics, clothing, books]
        inStock:
          type: boolean
        images:
          type: array
          items:
            type: string
            format: uri
        createdAt:
          type: string
          format: date-time
      required: [id, name, price, category]
    
    CreateProductRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 3
        description:
          type: string
        price:
          type: number
          minimum: 0.01
        category:
          type: string
          enum: [electronics, clothing, books]
      required: [name, price, category]
    
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        pages:
          type: integer
    
    Error:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
```

---

## Troubleshooting

### Common Issues

**Issue: "Cannot resolve reference #/components/schemas/User"**
```
Solution: Ensure schema is defined in components.schemas section
```

**Issue: "Invalid OpenAPI version"**
```
Solution: Check openapi field is "3.0.x" or "3.1.x", not "3.0" or "3"
```

**Issue: "Spec validation failed"**
```
Solution: Use online validator: https://apitools.dev/swagger-parser/online/
```

**Issue: "Circular reference detected"**
```yaml
# ❌ Bad (circular)
User:
  type: object
  properties:
    friends:
      type: array
      items:
        $ref: '#/components/schemas/User'

# ✅ Good (limit depth)
User:
  type: object
  properties:
    friends:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
          name:
            type: string
```

---

## Performance Optimization

### Spec Parsing Performance

**Lazy Schema Resolution:**
```typescript
// Don't resolve all schemas upfront
// Resolve only when endpoint is hit

const schemaCache = new Map<string, ResolvedSchema>();

function getSchema(ref: string): ResolvedSchema {
  if (schemaCache.has(ref)) {
    return schemaCache.get(ref)!;
  }
  
  const resolved = resolveSchema(ref, spec);
  schemaCache.set(ref, resolved);
  return resolved;
}
```

**Route Registration Performance:**
```typescript
// Register routes on-demand (lazy generation)
// Instead of upfront (faster startup)

const registeredRoutes = new Set<string>();

app.use((req, res, next) => {
  const routeKey = `${req.method} ${req.path}`;
  
  if (!registeredRoutes.has(routeKey)) {
    registerRoute(req.method, req.path);
    registeredRoutes.add(routeKey);
  }
  
  next();
});
```

---

## Testing Spec Integration

See `docs/05-TESTING.md` for complete testing strategy.

**Example Unit Test:**
```typescript
import { loadSpec } from '../src/loader';

describe('Spec Loading', () => {
  it('should load valid OpenAPI 3.0 spec', async () => {
    const spec = await loadSpec('./tests/fixtures/valid-spec.yaml');
    
    expect(spec.openapi).toMatch(/^3\.0/);
    expect(spec.paths).toBeDefined();
    expect(spec.info).toBeDefined();
  });
  
  it('should throw error for invalid spec', async () => {
    await expect(
      loadSpec('./tests/fixtures/invalid-spec.yaml')
    ).rejects.toThrow(InvalidSpecError);
  });
});
```