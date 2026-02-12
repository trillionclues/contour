A few weeks ago I shared Contour — a CLI tool that spins up mock APIs from your OpenAPI spec. Since then, I've shipped the first stable release.

What's in v1.0.0:

🔹 Published to npm — npm i -g @trillionclues/contour
🔹 Smart data generation for matching field names to produce realistic values using Faker.js heuristics
🔹 Request body validation — POST/PUT/PATCH payloads are validated against your schema
🔹 x-contour extensions — control array sizes, per-route latency, and deterministic seeding directly in your spec
🔹 Stateful CRUD — --stateful flag gives you in-memory POST → GET → DELETE without a database
🔹 Chaos testing — --error-rate 15 --delay 500-2000 simulates flaky backends

You can get started in one line:

npx @trillionclues/contour start openapi.yaml

npm: https://www.npmjs.com/package/@trillionclues/contour
GitHub: https://github.com/trillionclues/contour

Would love feedback — what features would make this more useful for your workflow?

#OpenSource #OpenAPI #BuildInPublic #ContourCLI


<!--   -->
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



<!--  -->
How Stateful Mode Works
Stateful mode uses an in-memory key-value store keyed by endpoint path. When you POST to /users, the response body gets stored in a Map. Subsequent GETs read from that Map, PUTs replace entries, and DELETEs remove them — so you get full CRUD behavior without a database. When the server stops, the state is gone.

It's basically a Map<string, Array<object>> that acts as a per-resource data store. Each route handler checks if stateful mode is on — if so, it reads/writes to the store instead of generating fresh data every time.


<!-- deployment workflow -->
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