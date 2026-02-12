# LinkedIn Post Draft

I'm excited to share Contour - a new open-source CLI tool I'm been building to solve the "missing/failing API" problem for developers.

There's always that stage in the SDLC where:
> Waiting for backend APIs to be ready
> Hardcoding JSON responses that go stale
> Battling with complex mock server configs
> Dealing with unrealistic dummy data

Contour changes this in a way. It analyzes your OpenAPI/Swagger spec and instantly spins up a production-level mock server.

What's different to MSW:
1. Zero config, just run contour start openapi.yaml. No config files needed.
2. Uses faker.js to generate context-aware realistic data based on your schema.
3. Apply stateful mode with the --stateful flag to POST/PUT/DELETE data in-memory, either for a CRUD or E2E test.
4. Supports chaos engineering, to simulate 500 errors or slow networks, add the with `--error-rate` and `--delay` flags.

Curreently works with local files but should be able to support remote URLs (even directly from Swagger UI!).

I am building this because existing tools like MSW often required extra setup and don't handle dynamic scenerios well. Now I just spin up a valid API response seconds all throught the CLI.

Check it out on GitHub (still in progress):
👉 https://lnkd.in/dW498xQA

#OpenSource #OpenAPI #BuildInPublic #Testing #ContourCLI


Area	Status	Files
CLI (start, cache, version)	✅ Complete	src/cli/
Spec Loader (local + remote + cache)	✅ Complete	src/loader/
Swagger 2.0 → OpenAPI 3.x conversion	✅ Complete	src/loader/validator.ts
Route generation (path → Express)	✅ Core done	src/routes/generator.ts
Data generation (string, number, bool, array, object)	✅ Core done	src/generator/faker-adapter.ts
Format handlers (uuid, email, date-time, ipv4, etc.)	✅ Inline in faker-adapter	src/generator/faker-adapter.ts
Schema resolution ($ref, nested)	✅ Complete	src/generator/schema-parser.ts
Stateful CRUD mode (--stateful)	✅ Complete	src/state/index.ts
Error rate simulation (--error-rate)	✅ Complete	src/server/middleware/error-rate.ts
Delay simulation (--delay)	✅ Complete	src/server/middleware/delay.ts
Auth simulation (--require-auth)	✅ Complete	src/server/middleware/auth.ts
CORS middleware	✅ Complete	src/server/middleware/cors.ts
Request logger middleware	✅ Complete	src/server/middleware/logger.ts
Error handling (custom errors, 404)	✅ Complete	src/server/middleware/error-handler.ts
Deterministic mode (--deterministic)	✅ Complete	src/generator/index.ts
CI/CD workflows	✅ Complete	.github/workflows/



1. pnpm pack --dry-run => to verify exactly what would be published
2. pnpm publish --dry-run => to verify exactly what would be published
3. pnpm publish => to publish
4. npm login          # if not already logged in
5. npm publish --otp=<your-otp-code>        # prepublishOnly will auto-run build + tests
6. Set the token directly in your project's
   .npmrc: echo "//registry.npmjs.org/:_authToken=npm_aqlpeOSnZm....." > ~/.npmrc
7. npm publish --access public

// Use the built-in npm version command to publish new changes
# Patch release (1.0.0 → 1.0.1) — bug fixes
npm version patch

# Minor release (1.0.0 → 1.1.0) — new features
npm version minor

# Major release (1.0.0 → 2.0.0) — breaking changes
npm version major

// Example
git add .
git commit -m "feat: add pagination support"
npm version minor          # bumps 1.0.0 → 1.1.0, commits, tags
npm publish --access public
git push && git push --tags