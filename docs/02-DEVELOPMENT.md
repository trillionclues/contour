# DEVELOPMENT GUIDE

## Prerequisites

### Required
- **Node.js:** >= 18.0.0 (LTS)
- **npm:** >= 9.0.0 or **pnpm** >= 8.0.0
- **Git:** >= 2.30.0

### Recommended
- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Error Lens

---

## Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/trillionclues/contour.git
cd contour
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Build Project
```bash
npm run build

#or
pnpm run build
```

### 4. Link Locally (for testing)
```bash
npm link

#or
pnpm link
```

Now you can run `contour` commands globally:
```bash
contour start examples/petstore.yaml
```

---

## Project Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/cli/index.ts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src/ --ext .ts",
    "lint:fix": "eslint src/ --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist/",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

**Usage:**
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm test` - Run unit tests
- `npm run lint` - Check code style
- `npm run format` - Auto-format code

<!-- or -->

pnpm run build
pnpm test
pnpm run lint
pnpm run format
---

## Coding Standards

### TypeScript Configuration

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Code Style

#### General Rules
- ✅ **Functional programming** preferred
- ✅ **Pure functions** when possible
- ✅ **Immutability** (use `const`, avoid mutations)
- ✅ **Explicit types** (avoid `any`)
- ✅ **Early returns** (reduce nesting)
- ✅ **Descriptive names** (no abbreviations)

#### Examples

**✅ Good:**
```typescript
function generateUser(schema: OpenAPISchema): User {
  const id = generateUUID();
  const email = faker.internet.email();
  const name = faker.person.fullName();
  
  return { id, email, name };
}
```

**❌ Bad:**
```typescript
function genUsr(s: any) {
  let u: any = {};
  u.i = Math.random();
  u.e = "test@test.com";
  return u;
}
```

---

### File Naming Conventions

- **Source files:** `kebab-case.ts` (e.g., `data-generator.ts`)
- **Test files:** `*.test.ts` or `*.spec.ts`
- **Type files:** `types.ts` or `index.ts` in `/types` folder
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PORT`)

---

### Import Order
```typescript
// 1. Node built-ins
import { promises as fs } from 'fs';
import path from 'path';

// 2. External dependencies
import express from 'express';
import { faker } from '@faker-js/faker';

// 3. Internal modules (absolute paths)
import { parseSchema } from '@/generator/schema-parser';
import type { OpenAPISpec } from '@/types';

// 4. Relative imports
import { logger } from '../utils/logger';
import type { Config } from './types';
```

---

### Error Handling

#### Use Custom Error Classes
```typescript
// src/utils/errors.ts
export class SpecNotFoundError extends Error {
  constructor(path: string) {
    super(`Spec file not found: ${path}`);
    this.name = 'SpecNotFoundError';
  }
}

export class InvalidSpecError extends Error {
  constructor(message: string) {
    super(`Invalid OpenAPI spec: ${message}`);
    this.name = 'InvalidSpecError';
  }
}

// Usage:
throw new SpecNotFoundError('/path/to/spec.yaml');
```

#### Always Catch Async Errors
```typescript
// ✅ Good
async function loadSpec(path: string): Promise<OpenAPISpec> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return parseYAML(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SpecNotFoundError(path);
    }
    throw error;
  }
}

// ❌ Bad (unhandled promise rejection)
async function loadSpec(path: string) {
  const content = await fs.readFile(path, 'utf-8');
  return parseYAML(content);
}
```

---

### Logging

Use centralized logger:
```typescript
import { logger } from '@/utils/logger';

logger.info('Server started', { port: 3001 });
logger.error('Failed to load spec', { error });
logger.debug('Generated data', { data });
```

**Log Levels:**
- `error` - Errors that stop execution
- `warn` - Issues that don't stop execution
- `info` - General information
- `debug` - Detailed debugging (only in dev mode)

---

### Comments

#### When to Comment
- ✅ Complex algorithms
- ✅ Non-obvious business logic
- ✅ Workarounds for library bugs
- ✅ Public API documentation (JSDoc)

#### When NOT to Comment
- ❌ Obvious code (`i++; // increment i`)
- ❌ Outdated comments
- ❌ Instead of refactoring

#### JSDoc for Public APIs
```typescript
/**
 * Generates realistic mock data from OpenAPI schema
 * 
 * @param schema - OpenAPI schema definition
 * @param options - Generation options
 * @returns Generated data matching schema
 * 
 * @example
 * const user = generateData({
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' }
 *   }
 * });
 */
export function generateData(
  schema: OpenAPISchema,
  options: GenerationOptions = {}
): unknown {
  // Implementation
}
```

---

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/add-graphql-support
```

### 2. Make Changes
- Write code
- Add tests
- Update documentation

### 3. Run Quality Checks
```bash
npm run typecheck      # Check types
npm run lint           # Check style
npm test               # Run tests
npm run format         # Format code

# or
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run format
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add GraphQL support"
```

See `docs/07-GIT-WORKFLOW.md` for commit message conventions.

### 5. Push & Create PR
```bash
git push origin feature/add-graphql-support
```

---

## Testing During Development

### Run Tests in Watch Mode
```bash
npm test -- --watch

# or
pnpm test -- --watch
```

### Test Specific File
```bash
npm test src/generator/schema-parser.test.ts

# or
pnpm test src/generator/schema-parser.test.ts
```

### Test with Coverage
```bash
npm run test:coverage

# or
pnpm run test:coverage
```

### Manual Testing
```bash
# Terminal 1: Start dev server
npm run dev start examples/petstore.yaml

# Terminal 2: Test requests
curl http://localhost:3001/users

# or
pnpm run dev start examples/petstore.yaml
curl http://localhost:3001/users
```

---

## Debugging

### VS Code Launch Configuration

**`.vscode/launch.json`:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "runtimeArgs": ["-r", "tsx/register"],
      "args": ["${workspaceFolder}/src/cli/index.ts", "start", "examples/petstore.yaml"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeArgs": ["--inspect-brk", "node_modules/.bin/vitest", "run"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debugging Tips
- Set breakpoints in VS Code
- Use `debugger;` statement
- Check logs with `DEBUG=contour:* contour start api.yaml`

---

## Common Development Tasks

### Adding a New Command
1. Create file in `src/cli/commands/new-command.ts`
2. Register in `src/cli/index.ts`
3. Add tests in `tests/unit/cli/new-command.test.ts`
4. Update docs in `README.md`

### Adding a New Format Handler
1. Create file in `src/generator/format-handlers/new-format.ts`
2. Export from `src/generator/format-handlers/index.ts`
3. Register in `src/generator/faker-adapter.ts`
4. Add tests

### Adding Middleware
1. Create file in `src/server/middleware/new-middleware.ts`
2. Register in `src/server/index.ts`
3. Add tests

---

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
npm run clean
npm run build

# or
pnpm run clean
pnpm run build
```

### Dependency Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# or
pnpm install
```

### Type Errors
```bash
# Check all type errors
npm run typecheck

# or
pnpm run typecheck
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 <PID>

# or
lsof -i :3001
kill -9 <PID>
```

---

## Performance Profiling

### Measure Startup Time
```bash
time contour start examples/petstore.yaml

# or
pnpm run dev start examples/petstore.yaml
```

### Measure Response Time
```bash
curl -w "@curl-format.txt" http://localhost:3001/users
```

**`curl-format.txt`:**
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_total:  %{time_total}\n
```

---

## Environment Variables

Create `.env` for local development:
```bash
DEBUG=contour:*
LOG_LEVEL=debug
PORT=3001
CACHE_DIR=/tmp/contour-cache
```

Load with:
```typescript
import dotenv from 'dotenv';
dotenv.config();
```

---

## Documentation Updates

When changing features:
1. Update README.md
2. Update relevant docs/**.md
3. Update JSDoc comments
4. Update examples/
5. Add to CHANGELOG.md