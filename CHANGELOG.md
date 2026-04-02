# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-04-02

### Added

- Added support for strict validation of request bodies and parameters
- Added `strictValidation: boolean` and `strictLevel: 'hard' | 'soft'` to the Config interface
- Introduced `x-strict` extension extension for per-endpoint opt-in
- Schema validators are cached by JSON hash - no CPU re-compilation per request

## [1.2.1] - 2026-03-26

### Fixed

- Request body validation now works correctly for all content types

[1.2.1]: https://github.com/trillionclues/contour/compare/v1.2.0...v1.2.1

## [1.2.0] - 2026-03-19

### Added

- `--host` / `-H` CLI flag to control the network interface contour binds to
  (e.g., `contour start spec.yaml --host 127.0.0.1`)
- `HOST` environment variable support as an alternative to the flag
- Default host changed from `127.0.0.1` to `0.0.0.0` so contour works
  correctly inside Docker containers without additional configuration

### Changed

- `DEFAULT_CONFIG.host` updated from `127.0.0.1` to `0.0.0.0`

### Fixed

- Mock servers running inside Docker containers are now reachable from the
  host machine and other containers by default, without requiring external
  patches to the source code

[1.2.0]: https://github.com/trillionclues/contour/compare/v1.1.1...v1.2.0

## [1.1.1] - 2026-02-19

### Added

- Initial project setup
- CLI with `start` and `cache` commands
- OpenAPI 3.x spec parsing and validation
- Realistic data generation with Faker.js
- Express server with CORS support
- Stateful and deterministic modes
- Latency and error simulation
- Auth simulation
- Request logger
- Error handler
- Health check
- 404 handler

[Unreleased]: https://github.com/trillionclues/contour/commits/main
