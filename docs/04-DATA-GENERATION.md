# DATA GENERATION STRATEGY

## Overview

Contour generates realistic mock data based on OpenAPI schemas. This document explains the data generation engine, format handlers, and customization options.

---

## Core Principles

1. **Realistic Over Random** - "sarah.martinez@example.com" not "test@test.com"
2. **Schema-Driven** - Respect all constraints (min/max, enum, format)
3. **Deterministic Option** - Same seed = same data (for E2E tests)
4. **Performance** - Generate <200ms per endpoint
5. **Extensible** - Easy to add custom generators

---

## Data Generation Flow
```
OpenAPI Schema
      ↓
Parse Schema Type
      ↓
Apply Constraints (min/max, enum, pattern)
      ↓
Check Format (uuid, email, date-time)
      ↓
Generate with Faker.js
      ↓
Validate Output
      ↓
Cache Result
```

---

## Type Handlers

### String Type

**Basic String:**
```typescript
// Schema:
{
  type: "string"
}

// Generated:
"Innovative scalable paradigm"  // Random phrase from faker
```

**With Length Constraints:**
```typescript
// Schema:
{
  type: "string",
  minLength: 10,
  maxLength: 20
}

// Generated:
"Hello world ex"  // Exactly between 10-20 chars
```

**Implementation:**
```typescript
// src/generator/type-handlers/string.ts
import { faker } from '@faker-js/faker';

export function generateString(schema: StringSchema): string {
  const minLength = schema.minLength || 5;
  const maxLength = schema.maxLength || 50;
  
  let value: string;
  
  // Generate until length is valid
  do {
    value = faker.lorem.words({ min: 1, max: 5 });
  } while (value.length < minLength || value.length > maxLength);
  
  // Truncate if needed
  if (value.length > maxLength) {
    value = value.substring(0, maxLength);
  }
  
  // Pad if needed
  while (value.length < minLength) {
    value += ' ' + faker.lorem.word();
  }
  
  return value.trim();
}
```

---

### Number Type

**Integer:**
```typescript
// Schema:
{
  type: "integer",
  minimum: 1,
  maximum: 100
}

// Generated:
42
```

**Float:**
```typescript
// Schema:
{
  type: "number",
  minimum: 0,
  maximum: 1000,
  multipleOf: 0.01  // 2 decimal places
}

// Generated:
245.67
```

**Implementation:**
```typescript
// src/generator/type-handlers/number.ts
export function generateNumber(schema: NumberSchema): number {
  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 100;
  
  let value: number;
  
  if (schema.type === 'integer') {
    value = faker.number.int({ min, max });
  } else {
    value = faker.number.float({ min, max, precision: 0.01 });
  }
  
  // Apply multipleOf constraint
  if (schema.multipleOf) {
    value = Math.round(value / schema.multipleOf) * schema.multipleOf;
  }
  
  return value;
}
```

---

### Boolean Type
```typescript
// Schema:
{
  type: "boolean"
}

// Generated:
true  // or false (50/50 chance)
```

**Implementation:**
```typescript
export function generateBoolean(): boolean {
  return faker.datatype.boolean();
}
```

---

### Array Type

**Fixed-Size Array:**
```typescript
// Schema:
{
  type: "array",
  items: {
    type: "string"
  },
  minItems: 3,
  maxItems: 5
}

// Generated:
["Innovation", "Paradigm", "Synergy", "Leverage"]
```

**Array of Objects:**
```typescript
// Schema:
{
  type: "array",
  items: {
    $ref: "#/components/schemas/User"
  }
}

// Generated (default 5 items):
[
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
  { id: "3", name: "Charlie" },
  { id: "4", name: "Diana" },
  { id: "5", name: "Eve" }
]
```

**Implementation:**
```typescript
// src/generator/type-handlers/array.ts
export function generateArray(schema: ArraySchema, context: Context): unknown[] {
  const minItems = schema.minItems ?? 5;
  const maxItems = schema.maxItems ?? 10;
  
  const count = faker.number.int({ min: minItems, max: maxItems });
  
  const items: unknown[] = [];
  for (let i = 0; i < count; i++) {
    const item = generateData(schema.items, {
      ...context,
      index: i
    });
    items.push(item);
  }
  
  return items;
}
```

---

### Object Type

**Simple Object:**
```typescript
// Schema:
{
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" }
  },
  required: ["name"]
}

// Generated:
{
  name: "Sarah Martinez",
  age: 34  // Optional, but generated
}
```

**Nested Object:**
```typescript
// Schema:
{
  type: "object",
  properties: {
    user: {
      type: "object",
      properties: {
        id: { type: "string" },
        profile: {
          type: "object",
          properties: {
            bio: { type: "string" }
          }
        }
      }
    }
  }
}

// Generated:
{
  user: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    profile: {
      bio: "Passionate about innovation and technology"
    }
  }
}
```

**Implementation:**
```typescript
// src/generator/type-handlers/object.ts
export function generateObject(schema: ObjectSchema, context: Context): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    // Always generate required fields
    const isRequired = schema.required?.includes(key);
    
    // Generate optional fields 80% of the time
    const shouldGenerate = isRequired || Math.random() > 0.2;
    
    if (shouldGenerate) {
      obj[key] = generateData(propSchema, {
        ...context,
        path: [...context.path, key]
      });
    }
  }
  
  return obj;
}
```

---

## Format Handlers

### UUID (format: uuid)
```typescript
// Schema:
{
  type: "string",
  format: "uuid"
}

// Generated:
"550e8400-e29b-41d4-a716-446655440000"
```

**Implementation:**
```typescript
// src/generator/format-handlers/uuid.ts
import { v4 as uuidv4 } from 'uuid';

export function generateUUID(): string {
  return uuidv4();
}
```

---

### Email (format: email)
```typescript
// Schema:
{
  type: "string",
  format: "email"
}

// Generated:
"sarah.martinez@example.com"
```

**Implementation:**
```typescript
// src/generator/format-handlers/email.ts
export function generateEmail(): string {
  return faker.internet.email({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    provider: 'example.com'  // Safe, won't bounce
  });
}
```

**Why example.com?**
- Reserved for documentation (RFC 2606)
- Won't accidentally send emails
- Looks realistic

---

### Date-Time (format: date-time)
```typescript
// Schema:
{
  type: "string",
  format: "date-time"
}

// Generated:
"2025-02-09T14:23:45.123Z"  // ISO 8601
```

**Implementation:**
```typescript
// src/generator/format-handlers/date-time.ts
export function generateDateTime(): string {
  const date = faker.date.recent({ days: 30 });
  return date.toISOString();
}
```

---

### Date (format: date)
```typescript
// Schema:
{
  type: "string",
  format: "date"
}

// Generated:
"2025-02-09"  // YYYY-MM-DD
```

---

### Time (format: time)
```typescript
// Schema:
{
  type: "string",
  format: "time"
}

// Generated:
"14:23:45"  // HH:MM:SS
```

---

### URI (format: uri)
```typescript
// Schema:
{
  type: "string",
  format: "uri"
}

// Generated:
"https://example.com/path/to/resource"
```

**Implementation:**
```typescript
export function generateURI(): string {
  return faker.internet.url();
}
```

---

### URL (format: url)

Same as URI.

---

### Hostname (format: hostname)
```typescript
// Schema:
{
  type: "string",
  format: "hostname"
}

// Generated:
"api.example.com"
```

---

### IPv4 (format: ipv4)
```typescript
// Schema:
{
  type: "string",
  format: "ipv4"
}

// Generated:
"192.168.1.100"
```

---

### IPv6 (format: ipv6)
```typescript
// Schema:
{
  type: "string",
  format: "ipv6"
}

// Generated:
"2001:0db8:85a3:0000:0000:8a2e:0370:7334"
```

---

### Password (format: password)
```typescript
// Schema:
{
  type: "string",
  format: "password"
}

// Generated:
"P@ssw0rd123!"  // Strong password
```

**Implementation:**
```typescript
export function generatePassword(): string {
  return faker.internet.password({
    length: 12,
    memorable: false,
    pattern: /[A-Za-z0-9!@#$%]/
  });
}
```

---

## Enum Handling

**Single Enum:**
```typescript
// Schema:
{
  type: "string",
  enum: ["admin", "user", "guest"]
}

// Generated:
"user"  // Randomly picked from enum
```

**Implementation:**
```typescript
export function generateEnum(schema: EnumSchema): string {
  const options = schema.enum;
  const index = faker.number.int({ min: 0, max: options.length - 1 });
  return options[index];
}
```

---

## Pattern Matching (regex)
```typescript
// Schema:
{
  type: "string",
  pattern: "^[A-Z]{3}-[0-9]{4}$"  // e.g., ABC-1234
}

// Generated:
"XYZ-5678"
```

**Implementation:**
```typescript
import RandExp from 'randexp';

export function generateFromPattern(pattern: string): string {
  const generator = new RandExp(pattern);
  return generator.gen();
}
```

**Library:** `randexp` - Generate strings matching regex

---

## Example Values (examples in schema)

**Use Example if Provided:**
```typescript
// Schema:
{
  type: "string",
  format: "email",
  example: "john.doe@company.com"
}

// Generated:
"john.doe@company.com"  // Use example, don't generate
```

**Implementation:**
```typescript
export function generateData(schema: Schema, context: Context): unknown {
  // Prefer example over generation
  if (schema.example !== undefined) {
    return schema.example;
  }
  
  // Otherwise generate based on type/format
  return generateByType(schema, context);
}
```

---

## Deterministic Mode

**Enable with --deterministic flag:**
```bash
contour start api.yaml --deterministic
```

**Behavior:**
- Same data every time server starts
- Same IDs for path parameters
- Useful for E2E tests

**Implementation:**
```typescript
// src/generator/index.ts
import { faker } from '@faker-js/faker';

export function initGenerator(config: Config) {
  if (config.deterministic) {
    // Fixed seed for reproducibility
    faker.seed(12345);
  } else {
    // Random seed
    faker.seed(Date.now());
  }
}

// Usage in E2E tests:
// GET /users/1 → Always returns same user
// GET /users/2 → Always returns different user (but same every time)
```

---

## Realistic Data Examples

### User Profile

**Schema:**
```yaml
User:
  type: object
  properties:
    id:
      type: string
      format: uuid
    email:
      type: string
      format: email
    firstName:
      type: string
    lastName:
      type: string
    age:
      type: integer
      minimum: 18
      maximum: 99
    role:
      type: string
      enum: [admin, user, guest]
    avatar:
      type: string
      format: uri
    bio:
      type: string
      maxLength: 200
    createdAt:
      type: string
      format: date-time
```

**Generated:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "sarah.martinez@example.com",
  "firstName": "Sarah",
  "lastName": "Martinez",
  "age": 34,
  "role": "user",
  "avatar": "https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/123.jpg",
  "bio": "Passionate about technology and innovation. Love hiking and photography.",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

---

### E-Commerce Product

**Schema:**
```yaml
Product:
  type: object
  properties:
    id:
      type: string
      format: uuid
    sku:
      type: string
      pattern: "^[A-Z]{3}-[0-9]{6}$"
    name:
      type: string
    description:
      type: string
    price:
      type: number
      minimum: 0.01
      maximum: 10000
    currency:
      type: string
      enum: [USD, EUR, GBP]
    inStock:
      type: boolean
    quantity:
      type: integer
      minimum: 0
    images:
      type: array
      items:
        type: string
        format: uri
      minItems: 1
      maxItems: 5
    rating:
      type: number
      minimum: 0
      maximum: 5
    reviewCount:
      type: integer
      minimum: 0
```

**Generated:**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "sku": "PRD-483726",
  "name": "Wireless Bluetooth Headphones",
  "description": "High-quality wireless headphones with active noise cancellation and 30-hour battery life.",
  "price": 149.99,
  "currency": "USD",
  "inStock": true,
  "quantity": 47,
  "images": [
    "https://example.com/images/product-1.jpg",
    "https://example.com/images/product-2.jpg",
    "https://example.com/images/product-3.jpg"
  ],
  "rating": 4.3,
  "reviewCount": 1247
}
```

---

### Blog Post

**Schema:**
```yaml
BlogPost:
  type: object
  properties:
    id:
      type: string
      format: uuid
    title:
      type: string
      minLength: 10
      maxLength: 100
    slug:
      type: string
      pattern: "^[a-z0-9-]+$"
    content:
      type: string
      minLength: 100
    author:
      $ref: '#/components/schemas/Author'
    tags:
      type: array
      items:
        type: string
      minItems: 1
      maxItems: 5
    published:
      type: boolean
    publishedAt:
      type: string
      format: date-time
    views:
      type: integer
      minimum: 0
```

**Generated:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "10 Tips for Building Scalable APIs",
  "slug": "10-tips-for-building-scalable-apis",
  "content": "Building scalable APIs requires careful planning and architecture decisions. In this article, we'll explore 10 essential tips to help you create APIs that can handle millions of requests...",
  "author": {
    "id": "c2d8a5b1-4f9e-4c3a-8b2e-1f5d3a7c9e4b",
    "name": "Alex Johnson",
    "avatar": "https://example.com/avatars/alex.jpg"
  },
  "tags": ["API", "Architecture", "Scalability", "Best Practices"],
  "published": true,
  "publishedAt": "2025-02-01T09:00:00.000Z",
  "views": 3847
}
```

---

## Contextual Data Generation

### Using Path Parameters in Data
```typescript
// Request: GET /users/alice-123

app.get('/users/:id', (req, res) => {
  const user = generateData(UserSchema, {
    overrides: {
      id: req.params.id,  // Use actual ID from path
      username: req.params.id.split('-')[0]  // Extract "alice"
    }
  });
  
  res.json(user);
});

// Response:
{
  "id": "alice-123",
  "username": "alice",
  "email": "alice@example.com",
  "name": "Alice Cooper"
}
```

---

### Relationships Between Resources
```typescript
// GET /users/1/posts

app.get('/users/:userId/posts', (req, res) => {
  const posts = generateArray(PostSchema, {
    count: 5,
    overrides: {
      userId: req.params.userId  // All posts belong to this user
    }
  });
  
  res.json(posts);
});

// Response:
[
  {
    "id": "post-1",
    "userId": "1",  // Same user for all posts
    "title": "My First Post",
    ...
  },
  {
    "id": "post-2",
    "userId": "1",
    "title": "My Second Post",
    ...
  }
]
```

---

## Performance Optimization

### Data Caching
```typescript
// src/generator/cache.ts
const cache = new Map<string, unknown>();

export function getCachedOrGenerate(
  cacheKey: string,
  generator: () => unknown
): unknown {
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const data = generator();
  cache.set(cacheKey, data);
  return data;
}

// Usage:
app.get('/users', (req, res) => {
  const users = getCachedOrGenerate('GET:/users', () => {
    return generateArray(UserSchema, { count: 10 });
  });
  
  res.json(users);
});
```

**Benefits:**
- First request: 150ms (generation)
- Subsequent requests: <5ms (cached)

---

### Lazy Generation

**Don't generate all endpoints upfront:**
```typescript
// ❌ Bad (slow startup)
for (const path of spec.paths) {
  const data = generateData(path.schema);
  cache.set(path, data);
}

// ✅ Good (fast startup)
// Generate only when endpoint is hit
app.use((req, res, next) => {
  if (!cache.has(req.path)) {
    const data = generateData(getSchemaForPath(req.path));
    cache.set(req.path, data);
  }
  next();
});
```

---

## Custom Generators (Advanced)

### Register Custom Format Handler
```typescript
// src/generator/format-handlers/custom.ts
import { registerFormatHandler } from '../faker-adapter';

// Custom format: credit-card
registerFormatHandler('credit-card', () => {
  return faker.finance.creditCardNumber();
});

// Custom format: bitcoin-address
registerFormatHandler('bitcoin-address', () => {
  return faker.finance.bitcoinAddress();
});

// Custom format: company-name
registerFormatHandler('company-name', () => {
  return faker.company.name();
});
```

**Usage in OpenAPI:**
```yaml
properties:
  creditCard:
    type: string
    format: credit-card  # Uses custom handler
```

---

## Testing Data Generation
```typescript
// tests/unit/generator/string.test.ts
import { generateString } from '../src/generator/type-handlers/string';

describe('String Generation', () => {
  it('should generate string within length constraints', () => {
    const schema = {
      type: 'string',
      minLength: 10,
      maxLength: 20
    };
    
    const result = generateString(schema);
    
    expect(result.length).toBeGreaterThanOrEqual(10);
    expect(result.length).toBeLessThanOrEqual(20);
  });
  
  it('should match pattern', () => {
    const schema = {
      type: 'string',
      pattern: '^[A-Z]{3}-[0-9]{4}$'
    };
    
    const result = generateString(schema);
    
    expect(result).toMatch(/^[A-Z]{3}-[0-9]{4}$/);
  });
});
```

---

## Troubleshooting

### Issue: Generated data doesn't match schema

**Check:**
1. Schema validation is enabled
2. Constraints are properly defined
3. Format handlers are registered

### Issue: Data generation is slow

**Solutions:**
1. Enable caching
2. Reduce array sizes
3. Use lazy generation
4. Optimize custom generators

### Issue: Same data every time (unwanted)

**Solution:**
```bash
# Make sure you're not in deterministic mode
contour start api.yaml
# NOT: contour start api.yaml --deterministic
```

### Issue: Unrealistic data

**Customize:**
```typescript
// Override faker locale
faker.setLocale('en_US');

// Use more specific faker methods
faker.person.firstName()  // Instead of faker.lorem.word()
```