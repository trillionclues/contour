# Contributing to Contour

Wagwan & thanks for your interest in contributing!

## Quick Start

```bash
git clone https://github.com/trillionclues/contour.git
cd contour
pnpm install
pnpm run build
pnpm test
```

## Development

```bash
pnpm run dev          # Watch mode
pnpm run lint         # Check code style
pnpm run typecheck    # Type checking
pnpm test             # Run tests (compulsory abeg)
```

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes with tests
3. Ensure all checks pass: `pnpm run lint && pnpm test`
4. Submit a PR with a clear description

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): resolve bug
docs: update documentation
chore: update dependencies (careful son!)
```

## Code of Conduct

Be respectful and constructive. Just here to build something great.

---

For detailed guidelines, see [docs/02-DEVELOPMENT.md](./docs/02-DEVELOPMENT.md) and [docs/07-GIT-WORKFLOW.md](./docs/07-GIT-WORKFLOW.md).
