<p align="center">
  <img src="./assets/images/contour.jpg" alt="Contour Logo" width="400" height="400">
</p>

<p align="center">
  Instantly spin up realistic API mocks from your OpenAPI spec — zero config, one command.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@trillionclues/contour"><img src="https://img.shields.io/npm/v/@trillionclues/contour?color=blue" alt="npm version"></a>
  <a href="https://github.com/trillionclues/contour/actions"><img src="https://github.com/trillionclues/contour/workflows/CI/badge.svg" alt="CI"></a>
  <a href="https://github.com/trillionclues/contour/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@trillionclues/contour" alt="License"></a>
</p>

## Install

```bash
npm install -g @trillionclues/contour
# or
pnpm add -g @trillionclues/contour
# or
npx @trillionclues/contour start openapi.yaml
```

**Requires Node.js >= 18**

## Usage

```bash
contour start ./api/openapi.yaml          # local file
contour start https://example-openapi.com/api.json  # remote URL
contour start curl -s http://127.0.0.1:3001/pet/findByStatus?status=pending | jq '.'   # Swagger UI page
```

Your mock API is running at `http://localhost:3001` with realistic, type-safe responses.

#### Sample Remote URL
```bash
https://petstore.swagger.io/v2/swagger.json (JSON format)
https://petstore.swagger.io/v2/swagger.yaml (YAML format)
```

### Options

```
contour start <spec> [options]

  -p, --port <number>       Port (default: 3001)
  --stateful                Persist POST/PUT/DELETE data in memory
  --deterministic           Reproducible data for E2E tests
  --delay <min-max>         Simulate latency, e.g. --delay 200-500
  --error-rate <percent>    Simulate failures, e.g. --error-rate 10
  --require-auth            Require Bearer token
```

### Examples

```bash
contour start api.yaml --port 4000 --delay 100-300
contour start api.yaml --deterministic --stateful
contour start api.yaml --error-rate 15 --delay 500-2000
```

## Features

- **Smart data generation** — property-name heuristics produce real names, emails, addresses
- **Stateful mode** — POST creates, GET retrieves, DELETE removes — full CRUD without a database
- **Request validation** — validates POST/PUT/PATCH bodies against your schema, returns `400` with details
- **`x-contour-*` extensions** — fine-tune per-endpoint behavior directly in your spec:

```yaml
/users:
  get:
    x-contour-count: 20              # array size override
    x-contour-delay: 1000            # per-route latency (ms)
    x-contour-deterministic: true    # consistent data per endpoint
```

- **Spec caching** — `contour cache list` / `contour cache clear`
- **Offline support** — cached specs work without network

## Framework Integration

**Next.js / React**
```json
{
  "scripts": {
    "dev": "concurrently \"contour start api.yaml\" \"next dev\"",
    "test:e2e": "contour start api.yaml --deterministic & playwright test"
  }
}
```

**Vite**
```js
// vite.config.js
export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:3001' } }
});
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © [trillionclues](https://github.com/trillionclues)
