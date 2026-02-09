# SECURITY & GUARDRAILS

## Overview

While Contour is a development tool (not production), we still implement security best practices to prevent accidental misuse and protect developer environments.

---

## Threat Model

### In Scope (What We Protect Against)

1. **Accidental Exposure**
   - Running on public interfaces
   - Accidentally serving on production domains
   - Sensitive data in specs

2. **Resource Exhaustion**
   - Memory leaks
   - Infinite loops in data generation
   - DoS from malicious specs

3. **Injection Attacks**
   - Path traversal in file loading
   - Command injection in CLI
   - XSS in generated data

### Out of Scope (Explicitly NOT Protected)

1. **Authentication/Authorization**
   - Not a production system
   - No real users or data
   - `--require-auth` is simulation only

2. **Data Encryption**
   - All data is fake/mock
   - No sensitive information

3. **Rate Limiting**
   - Local development tool
   - No external traffic

---

## Network Security

### Localhost Only by Default
```typescript
// src/server/index.ts
export function createServer(spec: OpenAPISpec, config: Config) {
  const app = express();
  
  // ALWAYS bind to localhost, never 0.0.0.0
  const host = '127.0.0.1';  // IPv4 localhost
  const port = config.port || 3001;
  
  app.listen(port, host, () => {
    logger.info(`Server running on http://${host}:${port}`);
  });
  
  return app;
}
```

**Why:** Prevents accidental exposure on public networks.

### CORS Policy
```typescript
// src/server/middleware/cors.ts
import cors from 'cors';

export function corsMiddleware() {
  return cors({
    origin: '*',  // Allow all origins (dev tool)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false  // No cookies
  });
}
```

**Why Permissive:**
- Development tool, not production
- Needs to work with any frontend
- No sensitive data to protect

---

## Input Validation

### Spec File Path Validation
```typescript
// src/loader/index.ts
import path from 'path';

export async function loadSpec(input: string): Promise<OpenAPISpec> {
  // Validate URL
  if (isURL(input)) {
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      throw new Error('Invalid URL protocol. Only http:// and https:// allowed');
    }
    return loadFromURL(input);
  }
  
  // Validate file path
  const absolutePath = path.resolve(input);
  
  // Prevent path traversal
  if (absolutePath.includes('..')) {
    throw new Error('Path traversal detected. Use absolute paths.');
  }
  
  // Ensure file is in allowed locations
  const cwd = process.cwd();
  if (!absolutePath.startsWith(cwd)) {
    throw new Error(`File must be within current directory: ${cwd}`);
  }
  
  return loadFromFile(absolutePath);
}
```

**Prevents:**
- Path traversal attacks (`../../etc/passwd`)
- Access to system files
- Loading arbitrary files

---

### CLI Argument Validation
```typescript
// src/cli/commands/start.ts
import { Command } from 'commander';

export function createStartCommand() {
  return new Command('start')
    .argument('<spec>', 'Path to OpenAPI spec file or URL')
    .option('-p, --port <number>', 'Port number', validatePort, 3001)
    .option('--delay <range>', 'Latency simulation', validateDelay)
    .option('--error-rate <number>', 'Error rate percentage', validateErrorRate)
    .action(start);
}

function validatePort(value: string): number {
  const port = parseInt(value, 10);
  
  if (isNaN(port)) {
    throw new Error('Port must be a number');
  }
  
  if (port < 1024 || port > 65535) {
    throw new Error('Port must be between 1024 and 65535');
  }
  
  return port;
}

function validateDelay(value: string): [number, number] {
  const match = value.match(/^(\d+)-(\d+)$/);
  
  if (!match) {
    throw new Error('Delay must be in format: min-max (e.g., 200-500)');
  }
  
  const [, min, max] = match;
  const minDelay = parseInt(min, 10);
  const maxDelay = parseInt(max, 10);
  
  if (minDelay > maxDelay) {
    throw new Error('Min delay cannot be greater than max delay');
  }
  
  if (maxDelay > 10000) {
    throw new Error('Max delay cannot exceed 10 seconds');
  }
  
  return [minDelay, maxDelay];
}

function validateErrorRate(value: string): number {
  const rate = parseInt(value, 10);
  
  if (isNaN(rate)) {
    throw new Error('Error rate must be a number');
  }
  
  if (rate < 0 || rate > 100) {
    throw new Error('Error rate must be between 0 and 100');
  }
  
  return rate;
}
```

---

## Resource Limits

### Memory Limits
```typescript
// src/generator/index.ts
const MAX_ARRAY_SIZE = 100;
const MAX_STRING_LENGTH = 10000;
const MAX_OBJECT_DEPTH = 10;

export function generateArray(schema: ArraySchema, context: Context): unknown[] {
  const maxItems = Math.min(schema.maxItems || 10, MAX_ARRAY_SIZE);
  
  if (maxItems > MAX_ARRAY_SIZE) {
    logger.warn(`Array size capped at ${MAX_ARRAY_SIZE} (requested: ${maxItems})`);
  }
  
  // Generate items...
}

export function generateString(schema: StringSchema): string {
  const maxLength = Math.min(schema.maxLength || 100, MAX_STRING_LENGTH);
  
  // Generate string...
}

export function generateObject(
  schema: ObjectSchema,
  context: Context
): Record<string, unknown> {
  if (context.depth > MAX_OBJECT_DEPTH) {
    throw new Error(
      `Maximum object nesting depth exceeded (${MAX_OBJECT_DEPTH}). ` +
      'Check for circular references in your spec.'
    );
  }
  
  // Generate object...
}
```

**Prevents:**
- Out of memory errors
- Infinite loops
- DoS from malicious specs

---

### Request Size Limits
```typescript
// src/server/index.ts
app.use(express.json({
  limit: '10mb',  // Max request body size
  strict: true    // Only accept objects and arrays
}));

// Limit URL length
app.use((req, res, next) => {
  if (req.url.length > 2048) {
    return res.status(414).json({
      error: 'URI Too Long',
      message: 'Request URL exceeds maximum length of 2048 characters'
    });
  }
  next();
});
```

---

### Spec Size Limits
```typescript
// src/loader/fetcher.ts
const MAX_SPEC_SIZE = 10 * 1024 * 1024; // 10MB

export async function loadFromURL(url: string): Promise<OpenAPISpec> {
  const response = await axios.get(url, {
    timeout: 10000,
    maxContentLength: MAX_SPEC_SIZE,
    headers: {
      'User-Agent': 'Contour/1.0.0'
    }
  });
  
  if (response.data.length > MAX_SPEC_SIZE) {
    throw new Error(`Spec file too large (max: ${MAX_SPEC_SIZE} bytes)`);
  }
  
  return parseSpec(response.data, url);
}
```

---

## Circular Reference Detection
```typescript
// src/generator/schema-parser.ts
export function resolveSchema(
  ref: string,
  spec: OpenAPISpec,
  visited: Set<string> = new Set()
): Schema {
  // Detect circular references
  if (visited.has(ref)) {
    logger.warn(`Circular reference detected: ${ref}`);
    return {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    };
  }
  
  visited.add(ref);
  
  const schema = getSchemaFromRef(ref, spec);
  
  if (schema.$ref) {
    return resolveSchema(schema.$ref, spec, visited);
  }
  
  return schema;
}
```

**Example Circular Reference:**
```yaml
# ❌ This would cause infinite loop without protection
User:
  type: object
  properties:
    friends:
      type: array
      items:
        $ref: '#/components/schemas/User'  # Circular!
```

---

## XSS Prevention

### Sanitize Generated Data
```typescript
// src/generator/format-handlers/string.ts
import { escape } from 'html-escaper';

export function generateString(schema: StringSchema): string {
  let value = faker.lorem.sentence();
  
  // Escape HTML entities to prevent XSS
  if (schema['x-contour-html-safe']) {
    value = escape(value);
  }
  
  return value;
}
```

**Note:** Since this is mock data, XSS is low risk, but we escape by default for safety.

---

## Secure Defaults

### Configuration Defaults
```typescript
// src/types/config.ts
export interface Config {
  port: number;           // Default: 3001 (not privileged)
  host: string;           // Default: '127.0.0.1' (localhost only)
  cors: boolean;          // Default: true (dev-friendly)
  stateful: boolean;      // Default: false (no state persistence)
  deterministic: boolean; // Default: false (random data)
  requireAuth: boolean;   // Default: false (no auth)
  delay: [number, number] | null;  // Default: null (no latency)
  errorRate: number;      // Default: 0 (no errors)
}

export const DEFAULT_CONFIG: Config = {
  port: 3001,
  host: '127.0.0.1',  // ⚠️ NEVER 0.0.0.0
  cors: true,
  stateful: false,
  deterministic: false,
  requireAuth: false,
  delay: null,
  errorRate: 0
};
```

---

## Error Handling

### Safe Error Messages
```typescript
// src/utils/errors.ts
export class SafeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'SafeError';
  }
  
  toJSON() {
    return {
      error: this.code,
      message: this.message,
      // NEVER include stack traces in production
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack
      })
    };
  }
}

// Usage:
throw new SafeError('Invalid spec format', 'INVALID_SPEC', 400);
```

**Prevents:**
- Information leakage via stack traces
- Exposing internal paths
- Revealing implementation details

---

## Dependency Security

### Audit Dependencies Regularly
```bash
# Check for vulnerabilities
npm audit

# or
pnpm audit

# Fix vulnerabilities
npm audit fix

# or
pnpm audit fix

# Force fix (may break)
npm audit fix --force

# or
pnpm audit fix --force
```

### Pin Dependencies

**`package.json`:**
```json
{
  "dependencies": {
    "express": "4.18.2",        // Exact version, not ^4.18.2
    "axios": "1.6.0",
    "faker": "8.3.1"
  },
  "devDependencies": {
    "vitest": "1.0.4",
    "typescript": "5.3.3"
  }
}
```

**Why:** Prevents supply chain attacks from malicious package updates.

---

### Allowed Dependencies

Only use dependencies from trusted sources:
- ✅ Official packages (express, axios)
- ✅ Well-maintained (100k+ downloads/week)
- ✅ Active security updates
- ❌ Unmaintained packages
- ❌ Packages with known vulnerabilities
- ❌ Obscure packages with <1k downloads

---

## Secrets Management

### No Secrets in Code
```typescript
// ❌ BAD
const API_KEY = 'sk-1234567890abcdef';

// ✅ GOOD
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error('API_KEY environment variable required');
}
```

### No Secrets in Logs
```typescript
// src/utils/logger.ts
function sanitizeLogData(data: any): any {
  const sensitiveFields = [
    'password',
    'apiKey',
    'secret',
    'token',
    'authorization'
  ];
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  return data;
}

logger.info('User data:', sanitizeLogData(userData));
```

---

## Rate Limiting (Optional)

While not required for local dev, we provide optional rate limiting:
```typescript
// src/server/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export function rateLimitMiddleware(config: Config) {
  if (!config.rateLimit) {
    return (req, res, next) => next();
  }
  
  return rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 1000,                  // Max 1000 requests per window
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  });
}
```

---

## Security Checklist

### Before Release

- [ ] All dependencies audited (`npm audit`)
- [ ] No known vulnerabilities
- [ ] Input validation on all user inputs
- [ ] Resource limits implemented
- [ ] Error messages don't leak information
- [ ] Default configuration is secure
- [ ] Localhost-only binding
- [ ] No hardcoded secrets
- [ ] Circular reference protection
- [ ] Path traversal protection

### During Development

- [ ] Regular `npm audit` runs
- [ ] Review all new dependencies
- [ ] Test with malicious inputs
- [ ] Check for memory leaks
- [ ] Validate error handling

---

## Reporting Security Issues

**DO NOT open public issues for security vulnerabilities.**

Email: security@yourproject.com

Include:
- Description of vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We will respond within 48 hours.

---

## Security Updates

We follow semantic versioning with security patches:
- **Patch (1.0.x):** Security fixes, no breaking changes
- **Minor (1.x.0):** New features, security improvements
- **Major (x.0.0):** Breaking changes

Security patches are released immediately when vulnerabilities are discovered.