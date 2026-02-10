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
