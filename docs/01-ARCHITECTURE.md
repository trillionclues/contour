# ARCHITECTURE & SYSTEM DESIGN

## High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  (Command parsing, validation, user interface)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Spec Loader Layer                         │
│  (Download, cache, parse OpenAPI specs)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Route Generator Layer                       │
│  (Convert OpenAPI paths to Express routes)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Data Generation Layer                        │
│  (Generate realistic mock data from schemas)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Express Server Layer                      │
│  (HTTP server, CORS, request handling)                      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. CLI Module (`src/cli/`)
**Responsibilities:**
- Parse command-line arguments
- Validate inputs
- Display help/version info
- Handle errors gracefully

**Files:**
```
src/cli/
├── index.ts              # Entry point
├── commands/
│   ├── start.ts          # Start server command
│   ├── cache.ts          # Cache management
│   └── version.ts        # Version info
├── parsers/
│   └── args-parser.ts    # Argument parsing
└── ui/
    ├── logger.ts         # Colored console output
    └── spinner.ts        # Loading indicators
```

**Key Libraries:**
- `commander` - CLI framework
- `chalk` - Terminal colors
- `ora` - Spinners

---

### 2. Spec Loader Module (`src/loader/`)
**Responsibilities:**
- Download OpenAPI specs from URLs
- Cache specs locally
- Parse YAML/JSON
- Validate spec format

**Files:**
```
src/loader/
├── index.ts              # Main loader
├── fetcher.ts            # HTTP fetching
├── cache.ts              # File system caching
├── parser.ts             # YAML/JSON parsing
└── validator.ts          # Spec validation
```

**Caching Strategy:**
```
~/.contour/
└── cache/
    ├── api.example.com_openapi.json
    ├── staging-api_swagger.yaml
    └── metadata.json     # Cache timestamps
```

**Key Libraries:**
- `axios` - HTTP requests
- `js-yaml` - YAML parsing
- `ajv` - JSON schema validation
- `openapi-types` - TypeScript types

---

### 3. Route Generator Module (`src/routes/`)
**Responsibilities:**
- Convert OpenAPI paths to Express routes
- Handle path parameters (`/users/{id}`)
- Support query parameters
- Validate request bodies

**Files:**
```
src/routes/
├── index.ts              # Route registration
├── generator.ts          # Path → Express route
├── validator.ts          # Request validation
└── response-builder.ts   # Response formatting
```

**Example Transformation:**
```typescript
// OpenAPI spec:
{
  "paths": {
    "/users/{id}": {
      "get": {
        "parameters": [{"name": "id", "in": "path", "schema": {"type": "string"}}],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/User"}
              }
            }
          }
        }
      }
    }
  }
}

// Generated Express route:
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  const user = dataGenerator.generate('User', { id: userId });
  res.json(user);
});
```

---

### 4. Data Generation Module (`src/generator/`)
**Responsibilities:**
- Generate realistic fake data
- Respect OpenAPI schema constraints
- Support all OpenAPI formats (uuid, email, date-time)
- Handle enums, arrays, objects

**Files:**
```
src/generator/
├── index.ts              # Main generator
├── schema-parser.ts      # Parse OpenAPI schemas
├── faker-adapter.ts      # Faker.js integration
├── format-handlers/
│   ├── uuid.ts           # UUID generation
│   ├── email.ts          # Realistic emails
│   ├── date-time.ts      # ISO timestamps
│   ├── url.ts            # Valid URLs
│   └── phone.ts          # Phone numbers
├── type-handlers/
│   ├── string.ts         # String generation
│   ├── number.ts         # Number generation
│   ├── boolean.ts        # Boolean generation
│   ├── array.ts          # Array generation
│   └── object.ts         # Object generation
└── cache.ts              # Generated data cache
```

**Generation Strategy:**
```typescript
// Schema:
{
  "type": "object",
  "properties": {
    "id": {"type": "string", "format": "uuid"},
    "email": {"type": "string", "format": "email"},
    "name": {"type": "string"},
    "age": {"type": "integer", "minimum": 18, "maximum": 99},
    "role": {"type": "string", "enum": ["admin", "user", "guest"]},
    "created_at": {"type": "string", "format": "date-time"}
  },
  "required": ["id", "email", "name"]
}

// Generated data:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "sarah.martinez@example.com",
  "name": "Sarah Martinez",
  "age": 34,
  "role": "user",
  "created_at": "2025-02-09T14:23:45.123Z"
}
```

**Key Libraries:**
- `@faker-js/faker` - Realistic fake data
- `uuid` - UUID v4 generation
- `date-fns` - Date formatting

---

### 5. Server Module (`src/server/`)
**Responsibilities:**
- HTTP server management
- CORS handling
- Request logging
- Error handling
- Middleware stack

**Files:**
```
src/server/
├── index.ts              # Server creation
├── middleware/
│   ├── cors.ts           # CORS configuration
│   ├── logger.ts         # Request logging
│   ├── error-handler.ts  # Error responses
│   ├── delay.ts          # Latency simulation
│   ├── error-rate.ts     # Random errors
│   └── auth.ts           # Token validation
└── state/
    └── store.ts          # Stateful mode storage
```

**Middleware Stack:**
```typescript
app.use(cors());                    // Enable CORS
app.use(requestLogger());           // Log requests
app.use(delayMiddleware());         // Simulate latency (--delay flag)
app.use(errorRateMiddleware());     // Random errors (--error-rate flag)
app.use(authMiddleware());          // Check Bearer token (--require-auth)
app.use(routes);                    // Application routes
app.use(errorHandler());            // Catch errors
```

**Key Libraries:**
- `express` - Web framework
- `cors` - CORS middleware
- `morgan` - HTTP logger

---

### 6. State Management Module (`src/state/`)
**Responsibilities (Stateful Mode Only):**
- In-memory data storage
- CRUD operations
- Data persistence during session

**Files:**
```
src/state/
├── index.ts              # State manager
├── store.ts              # In-memory store
└── operations.ts         # CRUD helpers
```

**State Structure:**
```typescript
// In-memory store
const state = {
  '/users': [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ],
  '/products': [
    { id: 'prod_1', name: 'Widget' }
  ]
};

// POST /users → Adds to state['/users']
// GET /users → Returns state['/users']
// DELETE /users/1 → Removes from state['/users']
```

---

## Data Flow Diagrams

### Startup Flow
```
User runs: contour start api.yaml
          ↓
CLI parses arguments
          ↓
Spec Loader fetches/parses api.yaml
          ↓
Route Generator creates Express routes
          ↓
Data Generator prepares schemas
          ↓
Express Server starts on port 3001
          ↓
Display: "Mock API running on localhost:3001"
```

### Request Flow (Non-Stateful)
```
Frontend: GET /users
          ↓
Express receives request
          ↓
Route matches: GET /users
          ↓
Check cache: users data exists?
          ↓ (No)
Data Generator creates 5 users
          ↓
Cache generated users
          ↓
Return: [{id: "1", name: "Alice"}, ...]
```

### Request Flow (Stateful)
```
Frontend: POST /users {name: "Charlie"}
          ↓
Express receives request
          ↓
Route matches: POST /users
          ↓
Validate request body against schema
          ↓
Generate ID for new user
          ↓
State Store adds user
          ↓
Return: {id: "3", name: "Charlie"}

Frontend: GET /users
          ↓
Route matches: GET /users
          ↓
State Store retrieves all users
          ↓
Return: [Alice, Bob, Charlie]
```

---

## File Structure
```
contour/
├── src/
│   ├── cli/
│   │   ├── index.ts
│   │   ├── commands/
│   │   ├── parsers/
│   │   └── ui/
│   ├── loader/
│   │   ├── index.ts
│   │   ├── fetcher.ts
│   │   ├── cache.ts
│   │   ├── parser.ts
│   │   └── validator.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── generator.ts
│   │   ├── validator.ts
│   │   └── response-builder.ts
│   ├── generator/
│   │   ├── index.ts
│   │   ├── schema-parser.ts
│   │   ├── faker-adapter.ts
│   │   ├── format-handlers/
│   │   └── type-handlers/
│   ├── server/
│   │   ├── index.ts
│   │   ├── middleware/
│   │   └── state/
│   ├── types/
│   │   └── index.ts        # TypeScript types
│   └── utils/
│       ├── logger.ts       # Logging utility
│       └── errors.ts       # Custom errors
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
├── examples/
│   ├── petstore.yaml       # Sample OpenAPI spec
│   └── nextjs-example/     # Example Next.js integration
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

---

## Technology Decisions

### Why Express.js?
- ✅ Mature, well-tested
- ✅ Huge ecosystem
- ✅ Simple routing
- ✅ Good performance
- ❌ Alternative: Fastify (faster but less familiar)

### Why Faker.js?
- ✅ Rich data generation
- ✅ Localization support
- ✅ Active maintenance
- ❌ Alternative: Chance.js (smaller, less features)

### Why Commander?
- ✅ Industry standard for CLIs
- ✅ Auto-generated help
- ✅ Subcommand support
- ❌ Alternative: yargs (more features, heavier)

### Why TypeScript?
- ✅ Type safety
- ✅ Better IDE support
- ✅ Easier refactoring
- ✅ OpenAPI types available

---

## Performance Considerations

### Lazy Generation Strategy
```typescript
// Don't generate all endpoints upfront
// Generate on first request

const cache = new Map();

app.get('/users', (req, res) => {
  if (!cache.has('/users')) {
    cache.set('/users', generateUsers(5));
  }
  res.json(cache.get('/users'));
});
```

**Why:** 
- Faster startup (<1s even for 100+ endpoints)
- Lower memory usage
- Only generate what's used

### Caching Strategy
- Spec files cached locally (avoid re-downloading)
- Generated data cached per endpoint (avoid re-generating)
- Cache invalidation on server restart (stateless mode)

### Memory Management
- Limit generated array sizes (default: 5-10 items)
- Don't persist state to disk (v1.0)
- Clear cache on process exit

---

## Error Handling Strategy

### Types of Errors

1. **User Input Errors**
   - Invalid spec path/URL
   - Spec file not found
   - Malformed YAML/JSON
   - **Response:** Clear error message + suggestion

2. **Spec Validation Errors**
   - Not a valid OpenAPI spec
   - Unsupported OpenAPI version
   - Missing required fields
   - **Response:** Point to spec issue, suggest fix

3. **Server Errors**
   - Port already in use
   - Permission denied
   - Out of memory
   - **Response:** Suggest alternative (e.g., `--port 3002`)

4. **Generation Errors**
   - Unsupported schema type
   - Circular references
   - Invalid constraints
   - **Response:** Log warning, use fallback

### Error Format
```typescript
// Good error message
❌ Error: Could not load spec from 'api.yaml'
   
   Reason: File not found
   
   Suggestions:
   • Check file path: /Users/dev/project/api.yaml
   • Use absolute path: contour start /full/path/api.yaml
   • Use URL: contour start https://example.com/api.yaml

// Bad error message
Error: ENOENT: no such file or directory
```

---

## Scalability Considerations

### Current Limitations (v1.0)
- Single process (no clustering)
- In-memory storage only
- No horizontal scaling
- Max ~10,000 requests/second

### Future Optimizations (v2.0+)
- Worker threads for data generation
- Redis for shared state
- Persistent storage option
- Load balancing support

---

## Security Considerations

See `docs/06-SECURITY.md` for full details.

**Key Points:**
- No authentication required (local dev only)
- CORS enabled by default (dev-friendly)
- No data persistence (privacy-safe)
- No network access except spec fetching