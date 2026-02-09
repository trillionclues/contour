# TESTING STRATEGY

## Overview

Contour uses a comprehensive testing strategy with unit tests, integration tests, and end-to-end tests. Target: 90%+ code coverage.

---

## Testing Stack

### Core Testing Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Vitest** | Unit & integration tests | ^1.0.0 |
| **Playwright** | E2E tests | ^1.40.0 |
| **Supertest** | HTTP assertions | ^6.3.0 |
| **MSW** | Mock HTTP requests | ^2.0.0 |
| **tsx** | TypeScript execution | ^4.0.0 |

### Why Vitest?
- ✅ Fast (uses Vite under the hood)
- ✅ Compatible with Jest API
- ✅ Built-in TypeScript support
- ✅ Watch mode is excellent
- ✅ Better ES modules support

---

## Test Organization
```
tests/
├── unit/                      # Unit tests (isolated functions)
│   ├── cli/
│   │   ├── args-parser.test.ts
│   │   └── commands/
│   │       ├── start.test.ts
│   │       └── cache.test.ts
│   ├── loader/
│   │   ├── fetcher.test.ts
│   │   ├── cache.test.ts
│   │   ├── parser.test.ts
│   │   └── validator.test.ts
│   ├── generator/
│   │   ├── schema-parser.test.ts
│   │   ├── faker-adapter.test.ts
│   │   ├── format-handlers/
│   │   │   ├── uuid.test.ts
│   │   │   ├── email.test.ts
│   │   │   └── date-time.test.ts
│   │   └── type-handlers/
│   │       ├── string.test.ts
│   │       ├── number.test.ts
│   │       ├── array.test.ts
│   │       └── object.test.ts
│   ├── routes/
│   │   ├── generator.test.ts
│   │   └── validator.test.ts
│   └── server/
│       └── middleware/
│           ├── cors.test.ts
│           ├── delay.test.ts
│           └── auth.test.ts
│
├── integration/               # Integration tests (multiple modules)
│   ├── spec-to-routes.test.ts
│   ├── data-generation.test.ts
│   ├── stateful-mode.test.ts
│   └── pagination.test.ts
│
├── e2e/                       # End-to-end tests (real server)
│   ├── basic-workflow.spec.ts
│   ├── advanced-features.spec.ts
│   ├── error-handling.spec.ts
│   └── performance.spec.ts
│
├── fixtures/                  # Test data
│   ├── specs/
│   │   ├── valid-spec.yaml
│   │   ├── invalid-spec.yaml
│   │   ├── petstore.yaml
│   │   └── complex-spec.yaml
│   └── responses/
│       └── expected-data.json
│
└── helpers/                   # Test utilities
    ├── server.ts              # Test server helper
    ├── matchers.ts            # Custom matchers
    └── mocks.ts               # Mock data
```

---

## Unit Tests

### Testing Pure Functions

**Example: String Generator**
```typescript
// tests/unit/generator/type-handlers/string.test.ts
import { describe, it, expect } from 'vitest';
import { generateString } from '@/generator/type-handlers/string';

describe('generateString', () => {
  it('should generate string of default length', () => {
    const schema = { type: 'string' };
    const result = generateString(schema);
    
    expect(result).toBeTypeOf('string');
    expect(result.length).toBeGreaterThan(0);
  });
  
  it('should respect minLength constraint', () => {
    const schema = { type: 'string', minLength: 20 };
    const result = generateString(schema);
    
    expect(result.length).toBeGreaterThanOrEqual(20);
  });
  
  it('should respect maxLength constraint', () => {
    const schema = { type: 'string', maxLength: 10 };
    const result = generateString(schema);
    
    expect(result.length).toBeLessThanOrEqual(10);
  });
  
  it('should respect both min and max length', () => {
    const schema = { type: 'string', minLength: 10, maxLength: 20 };
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
  
  it('should use example if provided', () => {
    const schema = { 
      type: 'string', 
      example: 'test-value' 
    };
    const result = generateString(schema);
    
    expect(result).toBe('test-value');
  });
});
```

---

### Testing with Mocks

**Example: Spec Fetcher**
```typescript
// tests/unit/loader/fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFromURL } from '@/loader/fetcher';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('loadFromURL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should fetch spec from URL', async () => {
    const mockSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {}
    };
    
    vi.mocked(axios.get).mockResolvedValue({
      data: mockSpec,
      status: 200
    });
    
    const result = await loadFromURL('https://example.com/api.yaml');
    
    expect(axios.get).toHaveBeenCalledWith(
      'https://example.com/api.yaml',
      expect.objectContaining({
        timeout: 10000
      })
    );
    expect(result).toEqual(mockSpec);
  });
  
  it('should throw error on network failure', async () => {
    vi.mocked(axios.get).mockRejectedValue(
      new Error('Network error')
    );
    
    await expect(
      loadFromURL('https://example.com/api.yaml')
    ).rejects.toThrow('Network error');
  });
  
  it('should use cached spec if available', async () => {
    // Mock cache
    vi.mock('@/loader/cache', () => ({
      getCachedSpec: vi.fn().mockResolvedValue({
        data: { openapi: '3.0.0' },
        age: 3600
      }),
      isStale: vi.fn().mockReturnValue(false)
    }));
    
    const result = await loadFromURL('https://example.com/api.yaml');
    
    // Should NOT call axios
    expect(axios.get).not.toHaveBeenCalled();
  });
});
```

---

### Testing Error Cases
```typescript
// tests/unit/loader/validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateAndNormalizeSpec } from '@/loader/validator';
import { InvalidSpecError } from '@/utils/errors';

describe('validateAndNormalizeSpec', () => {
  it('should throw error for missing openapi version', () => {
    const invalidSpec = {
      info: { title: 'Test', version: '1.0.0' },
      paths: {}
    };
    
    expect(() => validateAndNormalizeSpec(invalidSpec))
      .toThrow(InvalidSpecError);
  });
  
  it('should throw error for unsupported version', () => {
    const invalidSpec = {
      openapi: '2.5.0',  // Invalid version
      info: { title: 'Test', version: '1.0.0' },
      paths: {}
    };
    
    expect(() => validateAndNormalizeSpec(invalidSpec))
      .toThrow('Unsupported OpenAPI version');
  });
  
  it('should validate required fields', () => {
    const invalidSpec = {
      openapi: '3.0.0'
      // Missing info and paths
    };
    
    expect(() => validateAndNormalizeSpec(invalidSpec))
      .toThrow(InvalidSpecError);
  });
  
  it('should accept valid spec', () => {
    const validSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      }
    };
    
    expect(() => validateAndNormalizeSpec(validSpec))
      .not.toThrow();
  });
});
```

---

## Integration Tests

### Testing Multiple Modules Together

**Example: Spec to Routes**
```typescript
// tests/integration/spec-to-routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '@/server';
import { loadSpec } from '@/loader';

describe('Spec to Routes Integration', () => {
  let app;
  let server;
  
  beforeAll(async () => {
    const spec = await loadSpec('./tests/fixtures/specs/petstore.yaml');
    app = createServer(spec, { port: 0 });
    server = app.listen();
  });
  
  afterAll(() => {
    server.close();
  });
  
  it('should create route from spec path', async () => {
    const response = await request(app).get('/pets');
    
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });
  
  it('should handle path parameters', async () => {
    const response = await request(app).get('/pets/123');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.id).toBe('123');
  });
  
  it('should validate request body on POST', async () => {
    const response = await request(app)
      .post('/pets')
      .send({ name: 'Fluffy' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Fluffy');
  });
  
  it('should return 400 for invalid request body', async () => {
    const response = await request(app)
      .post('/pets')
      .send({ invalidField: 'value' });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
```

---

### Testing Stateful Mode
```typescript
// tests/integration/stateful-mode.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '@/server';
import { loadSpec } from '@/loader';

describe('Stateful Mode', () => {
  let app;
  
  beforeEach(async () => {
    const spec = await loadSpec('./tests/fixtures/specs/petstore.yaml');
    app = createServer(spec, { 
      port: 0, 
      stateful: true 
    });
  });
  
  it('should persist created resources', async () => {
    // Create a pet
    const createResponse = await request(app)
      .post('/pets')
      .send({ name: 'Fluffy', species: 'cat' });
    
    expect(createResponse.status).toBe(201);
    const petId = createResponse.body.id;
    
    // Retrieve the pet
    const getResponse = await request(app).get(`/pets/${petId}`);
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.name).toBe('Fluffy');
    expect(getResponse.body.species).toBe('cat');
  });
  
  it('should update resources with PUT', async () => {
    // Create
    const createResponse = await request(app)
      .post('/pets')
      .send({ name: 'Fluffy', species: 'cat' });
    
    const petId = createResponse.body.id;
    
    // Update
    const updateResponse = await request(app)
      .put(`/pets/${petId}`)
      .send({ name: 'Mittens', species: 'cat' });
    
    expect(updateResponse.status).toBe(200);
    
    // Verify
    const getResponse = await request(app).get(`/pets/${petId}`);
    expect(getResponse.body.name).toBe('Mittens');
  });
  
  it('should delete resources', async () => {
    // Create
    const createResponse = await request(app)
      .post('/pets')
      .send({ name: 'Fluffy', species: 'cat' });
    
    const petId = createResponse.body.id;
    
    // Delete
    const deleteResponse = await request(app).delete(`/pets/${petId}`);
    expect(deleteResponse.status).toBe(204);
    
    // Verify deleted
    const getResponse = await request(app).get(`/pets/${petId}`);
    expect(getResponse.status).toBe(404);
  });
  
  it('should list all created resources', async () => {
    // Create multiple pets
    await request(app).post('/pets').send({ name: 'Fluffy' });
    await request(app).post('/pets').send({ name: 'Mittens' });
    await request(app).post('/pets').send({ name: 'Whiskers' });
    
    // List all
    const response = await request(app).get('/pets');
    
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(3);
  });
});
```

---

### Testing Data Generation
```typescript
// tests/integration/data-generation.test.ts
import { describe, it, expect } from 'vitest';
import { generateData } from '@/generator';
import { loadSpec } from '@/loader';

describe('Data Generation', () => {
  it('should generate data matching schema', async () => {
    const spec = await loadSpec('./tests/fixtures/specs/petstore.yaml');
    const userSchema = spec.components.schemas.User;
    
    const user = generateData(userSchema);
    
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user.email).toMatch(/@/);
  });
  
  it('should respect enum constraints', async () => {
    const schema = {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest']
        }
      }
    };
    
    const data = generateData(schema);
    
    expect(['admin', 'user', 'guest']).toContain(data.role);
  });
  
  it('should generate deterministic data with seed', async () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' }
      }
    };
    
    // Same seed should produce same data
    const data1 = generateData(schema, { seed: 12345 });
    const data2 = generateData(schema, { seed: 12345 });
    
    expect(data1).toEqual(data2);
  });
  
  it('should handle nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            profile: {
              type: 'object',
              properties: {
                bio: { type: 'string' }
              }
            }
          }
        }
      }
    };
    
    const data = generateData(schema);
    
    expect(data.user).toBeDefined();
    expect(data.user.profile).toBeDefined();
    expect(data.user.profile.bio).toBeTypeOf('string');
  });
});
```

---

## End-to-End Tests

### Using Playwright

**Example: Basic Workflow**
```typescript
// tests/e2e/basic-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

test.describe('Basic Workflow', () => {
  let serverProcess;
  
  test.beforeAll(async () => {
    // Start server
    serverProcess = spawn('node', [
      'dist/cli/index.js',
      'start',
      'tests/fixtures/specs/petstore.yaml',
      '--port',
      '3456'
    ]);
    
    // Wait for server to start
    await setTimeout(2000);
  });
  
  test.afterAll(() => {
    serverProcess.kill();
  });
  
  test('should start server and return data', async ({ request }) => {
    const response = await request.get('http://localhost:3456/pets');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });
  
  test('should handle CORS', async ({ request }) => {
    const response = await request.get('http://localhost:3456/pets', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe('*');
  });
  
  test('should handle authentication when required', async ({ request }) => {
    // Restart with auth
    serverProcess.kill();
    serverProcess = spawn('node', [
      'dist/cli/index.js',
      'start',
      'tests/fixtures/specs/petstore.yaml',
      '--port',
      '3456',
      '--require-auth'
    ]);
    await setTimeout(2000);
    
    // Without token
    const noAuthResponse = await request.get('http://localhost:3456/pets');
    expect(noAuthResponse.status()).toBe(401);
    
    // With token
    const withAuthResponse = await request.get('http://localhost:3456/pets', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    expect(withAuthResponse.ok()).toBeTruthy();
  });
});
```

---

### Testing CLI Commands
```typescript
// tests/e2e/cli-commands.spec.ts
import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('CLI Commands', () => {
  test('should show version', async () => {
    const { stdout } = await execAsync('node dist/cli/index.js --version');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });
  
  test('should show help', async () => {
    const { stdout } = await execAsync('node dist/cli/index.js --help');
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('Options:');
  });
  
  test('should cache remote specs', async () => {
    // First fetch (downloads)
    const { stdout: stdout1 } = await execAsync(
      'node dist/cli/index.js start https://petstore3.swagger.io/api/v3/openapi.json --ci'
    );
    expect(stdout1).toContain('Fetching spec');
    
    // Second fetch (uses cache)
    const { stdout: stdout2 } = await execAsync(
      'node dist/cli/index.js start https://petstore3.swagger.io/api/v3/openapi.json --ci'
    );
    expect(stdout2).toContain('Using cached spec');
  });
  
  test('should clear cache', async () => {
    await execAsync('node dist/cli/index.js cache clear');
    
    const { stdout } = await execAsync('node dist/cli/index.js cache list');
    expect(stdout).toContain('No cached specs');
  });
});
```

---

## Performance Tests
```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

test.describe('Performance', () => {
  let serverProcess;
  
  test.beforeAll(async () => {
    serverProcess = spawn('node', [
      'dist/cli/index.js',
      'start',
      'tests/fixtures/specs/complex-spec.yaml',
      '--port',
      '3456'
    ]);
    await setTimeout(2000);
  });
  
  test.afterAll(() => {
    serverProcess.kill();
  });
  
  test('should start server in <1 second', async () => {
    const startTime = Date.now();
    
    const process = spawn('node', [
      'dist/cli/index.js',
      'start',
      'tests/fixtures/specs/petstore.yaml',
      '--port',
      '3457'
    ]);
    
    // Wait for server ready
    await setTimeout(1500);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000);
    
    process.kill();
  });
  
  test('should handle 100 concurrent requests', async ({ request }) => {
    const requests = Array(100).fill(null).map(() =>
      request.get('http://localhost:3456/pets')
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
    
    // Should complete in <5 seconds
    expect(endTime - startTime).toBeLessThan(5000);
  });
  
  test('should respond in <10ms for cached data', async ({ request }) => {
    // First request (generates data)
    await request.get('http://localhost:3456/pets');
    
    // Second request (cached)
    const startTime = Date.now();
    await request.get('http://localhost:3456/pets');
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(10);
  });
});
```

---

## Test Coverage

### Coverage Configuration

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },
    globals: true,
    environment: 'node'
  }
});
```

### Running Coverage
```bash
npm run test:coverage

# or
pnpm run test:coverage

# Output:
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
All files             |   92.5  |   88.3   |   94.1  |   92.8
 cli/                 |   95.2  |   90.1   |   96.3  |   95.5
 loader/              |   91.3  |   87.2   |   92.1  |   91.6
 generator/           |   93.8  |   89.5   |   95.2  |   94.1
 routes/              |   90.5  |   85.7   |   91.3  |   90.8
 server/              |   94.1  |   91.2   |   95.8  |   94.3
```

### Coverage Requirements

- **Lines:** 90%+ (every line of code should be executed)
- **Branches:** 85%+ (every if/else path should be tested)
- **Functions:** 90%+ (every function should be called)
- **Statements:** 90%+ (every statement should run)

---

## Custom Test Utilities

### Test Server Helper
```typescript
// tests/helpers/server.ts
import { createServer } from '@/server';
import { loadSpec } from '@/loader';
import type { Server } from 'http';

export async function createTestServer(
  specPath: string,
  options = {}
): Promise<{ app: Express, server: Server, baseURL: string }> {
  const spec = await loadSpec(specPath);
  const app = createServer(spec, { port: 0, ...options });
  const server = app.listen();
  
  const address = server.address();
  const port = typeof address === 'object' ? address.port : 3000;
  const baseURL = `http://localhost:${port}`;
  
  return { app, server, baseURL };
}

// Usage:
import { createTestServer } from '../helpers/server';

test('example', async () => {
  const { server, baseURL } = await createTestServer('./spec.yaml');
  
  const response = await fetch(`${baseURL}/users`);
  
  server.close();
});
```

---

### Custom Matchers
```typescript
// tests/helpers/matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`
    };
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`
    };
  },
  
  toBeValidISO8601(received: string) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    const pass = iso8601Regex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid ISO 8601 date`
          : `Expected ${received} to be a valid ISO 8601 date`
    };
  }
});

// Usage:
test('should generate valid UUID', () => {
  const user = generateUser();
  expect(user.id).toBeValidUUID();
  expect(user.email).toBeValidEmail();
  expect(user.createdAt).toBeValidISO8601();
});
```

---

## Continuous Integration

### GitHub Actions Workflow

**`.github/workflows/test.yml`:**
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci

      # or

      - name: Install dependencies
        run: pnpm ci
      
      - name: Run type check
        run: npm run typecheck

      # or

      - name: Run type check
        run: pnpm run typecheck
      
      - name: Run linter
        run: npm run lint

      # or

      - name: Run linter
        run: pnpm run lint
      
      - name: Run unit tests
        run: npm run test:coverage

      # or

      - name: Run unit tests
        run: pnpm run test:coverage
      
      - name: Run E2E tests
        run: npm run test:e2e

      # or

      - name: Run E2E tests
        run: pnpm run test:e2e
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
      
      - name: Check coverage thresholds
        run: |
          node scripts/check-coverage.js
```

---

## Test Fixtures

### Creating Test Specs

**Minimal Spec:**
```yaml
# tests/fixtures/specs/minimal-spec.yaml
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

**Complex Spec:**
```yaml
# tests/fixtures/specs/complex-spec.yaml
openapi: 3.1.0
info:
  title: E-Commerce API
  version: 1.0.0
paths:
  /users:
    get:
      parameters:
        - name: role
          in: query
          schema:
            type: string
            enum: [admin, user, guest]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          content:
            application/json:
              schema:
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
        role:
          type: string
          enum: [admin, user, guest]
      required: [id, email, name]
    CreateUserRequest:
      type: object
      properties:
        email:
          type: string
          format: email
        name:
          type: string
      required: [email, name]
```

---

## Debugging Tests

### VS Code Test Configuration

**`.vscode/launch.json`:**
```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["${file}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug All Tests",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Tips
```bash
# Run single test file
npm test tests/unit/generator/string.test.ts

# or
pnpm test tests/unit/generator/string.test.ts

# Run tests matching pattern
npm test -- --grep "should generate UUID"

# or
pnpm test -- --grep "should generate UUID"

# Run tests in watch mode
npm test -- --watch

# or
pnpm test -- --watch

# Run with verbose output
npm test -- --reporter=verbose

# or
pnpm test -- --reporter=verbose

# Run only failed tests
npm test -- --changed

# or
pnpm test -- --changed
```

---

## Testing Best Practices

### ✅ DO

- Write tests before fixing bugs (TDD for bug fixes)
- Test edge cases (null, undefined, empty arrays)
- Test error conditions
- Use descriptive test names
- Keep tests independent
- Clean up after tests (close servers, clear mocks)
- Use realistic test data

### ❌ DON'T

- Test implementation details (test behavior, not internals)
- Write flaky tests (random failures)
- Share state between tests
- Skip tests without good reason
- Test third-party libraries
- Write tests that depend on external services

---

## Test Maintenance

### Updating Tests After Changes

1. **Feature Addition:**
   - Add new test file
   - Update integration tests
   - Update E2E tests if needed

2. **Bug Fix:**
   - Write failing test first
   - Fix bug
   - Verify test passes

3. **Refactoring:**
   - Tests should still pass
   - Update mocks if interfaces changed
   - Don't test internal refactoring

### Regular Maintenance
```bash
# Run full test suite
npm test

# or
pnpm test

# Check coverage
npm run test:coverage

# or
pnpm run test:coverage

# Update snapshots (if using)
npm test -- -u

# Clean test cache
npm test -- --clearCache

# or
pnpm test -- --clearCache
```

---

## Troubleshooting

### Tests Timing Out
```typescript
// Increase timeout for slow tests
test('slow operation', async () => {
  // Default timeout is 5s
}, 10000); // 10 seconds
```

### Port Conflicts
```typescript
// Use port 0 for random available port
const server = app.listen(0);
```

### Flaky Tests
```typescript
// ❌ Bad (time-dependent)
test('should be recent', () => {
  const user = generateUser();
  expect(user.createdAt).toBe(new Date().toISOString());
});

// ✅ Good (check format, not exact time)
test('should have valid timestamp', () => {
  const user = generateUser();
  expect(user.createdAt).toBeValidISO8601();
  expect(new Date(user.createdAt)).toBeInstanceOf(Date);
});
```