<p align="center">
  <img src="./assets/images/contour.jpg" alt="Contour Logo" width="120" height="120">
</p>

<h1 align="center">Contour</h1>

<p align="center">
  <strong>Instantly spin up type-safe API mocks from your contracts</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/contour"><img src="https://img.shields.io/npm/v/contour?color=blue" alt="npm version"></a>
  <a href="https://github.com/trillionclues/contour/actions"><img src="https://github.com/trillionclues/contour/workflows/CI/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/trillionclues/contour"><img src="https://codecov.io/gh/trillionclues/contour/branch/main/graph/badge.svg" alt="Coverage"></a>
  <a href="https://github.com/trillionclues/contour/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/contour" alt="License"></a>
</p>

## Quick Start

```bash
# Install globally
pnpm add -g contour

# Start mock server from your OpenAPI spec
contour start openapi.yaml
```

Your mock API is now running at `http://localhost:3001` with realistic, type-safe responses.


## Why Contour?

| Feature | Contour | Others |
|---------|---------|--------|
| Zero config | One command | Heavy setup |
| Realistic data | Smart generation | `test@test.com` |
| OpenAPI 3.x | Full support | Partial |
| Startup time | <1 second | Slow |
| Offline mode | Cached specs | Online only |

## Installation

```bash
# pnpm (recommended)
pnpm add -g contour

# npm
npm install -g contour

# Local project
pnpm add -D contour
```

**Requirements:** Node.js >= 18.0.0

## Usage

```bash
# Local file
contour start ./api/openapi.yaml

# Remote URL
contour start https://api.example.com/openapi.json
# or
contour start test-service.eks-bytedance.com/swagger-ui/index.html
```

### Options

```bash
contour start <spec> [options]

Options:
  -p, --port <number>       Port number (default: 3001)
  --stateful                Enable stateful mode (persist POST/PUT/DELETE)
  --deterministic           Same seed produces same data (for E2E tests)
  --delay <min-max>         Simulate latency, e.g., --delay 200-500
  --error-rate <percent>    Simulate random errors, e.g., --error-rate 10
  --require-auth            Require Bearer token for requests
  -h, --help                Show help
```

```bash
# Custom port with latency simulation
contour start api.yaml --port 4000 --delay 100-300

# E2E testing mode (deterministic data)
contour start api.yaml --deterministic

# Stateful CRUD operations
contour start api.yaml --stateful

# Simulate unreliable network
contour start api.yaml --error-rate 15 --delay 500-2000
```

### OpenAPI Extensions

Customize mock behavior with `x-contour-*` extensions in your spec:

```yaml
/users:
  get:
    x-contour-count: 20        # Generate 20 items instead of default 5
    x-contour-delay: 1000      # Always 1s delay for this endpoint
    x-contour-deterministic: true  # Consistent data for this endpoint
```


### Cache Management

```bash
# List cached specs
contour cache list

# Clear all cached specs
contour cache clear
```

### Framework Integration

#### Next.js

```json
// package.json
{
  "scripts": {
    "dev": "concurrently \"contour start api.yaml\" \"next dev\"",
    "test:e2e": "contour start api.yaml --deterministic & playwright test"
  }
}
```

#### Vite

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

## Documentation

- [Architecture](./docs/01-ARCHITECTURE.md)
- [Development Guide](./docs/02-DEVELOPMENT.md)
- [API Integration](./docs/03-API-INTEGRATION.md)
- [Data Generation](./docs/04-DATA-GENERATION.md)
- [Testing](./docs/05-TESTING.md)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) © [trillionclues](https://github.com/trillionclues)
