# PROJECT OVERVIEW

## Project Name
**Contour** - Professional API mock server from OpenAPI specifications

## Tagline
"Shape your API mocks from OpenAPI specs"

## Vision
Replace clunky, configuration-heavy mock servers (Prism, MSW, json-server) with a zero-config, production-grade solution that generates realistic data.

## Problem Statement
Frontend developers waste 2-4 hours per project setting up mock APIs. Existing tools:
- ❌ Require heavy configuration (Prism, MSW)
- ❌ Generate unrealistic data (json-server)
- ❌ Don't support modern OpenAPI 3.x well
- ❌ Poor developer experience

## Solution
One command to start a realistic mock API server:
```bash
contour start openapi.yaml
```

**Features:**
- ⚡ Zero configuration required
- 🎯 Realistic data generation (not "test@test.com")
- 📦 Offline-first (caches specs)
- 🧪 E2E test friendly (deterministic mode)
- 🚀 Fast (<1s startup, <10ms responses)

## Target Users
1. **Frontend Developers** - Build UIs before backend exists
2. **QA Engineers** - E2E tests without backend dependency
3. **API Designers** - Test OpenAPI specs quickly
4. **Product Demos** - Show features with realistic data

## Success Metrics (v1.0)
- [ ] 10,000+ npm/pnpm downloads/month (6 months post-launch)
- [ ] <1 second server startup
- [ ] 95%+ OpenAPI 3.x spec compatibility
- [ ] 4.5+ stars on npm/pnpm
- [ ] Zero breaking changes in minor versions

## Non-Goals (v1.0)
- ❌ GraphQL support (v2.0)
- ❌ WebSocket mocking (v2.0)
- ❌ Persistent database (in-memory only)
- ❌ UI dashboard (CLI only)
- ❌ Cloud hosting

## Timeline
- **Week 1-2:** Core CLI + OpenAPI parser
- **Week 3-4:** Express server + basic mocking
- **Week 5-6:** Data generation engine
- **Week 7-8:** Advanced features (stateful, deterministic)
- **Week 9:** Testing + CI/CD
- **Week 10:** Documentation + launch

## Team (if applicable)
- Lead: [Your name]
- Contributors: Open source

## License
MIT

## Repository
- GitHub: `github.com/trillionclues/contour`
- npm: `@trillionclues/contour` or `contour`