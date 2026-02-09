# DEPLOYMENT & RELEASE

## Overview

Contour is distributed as an npm or pnpm package. This document covers the build, publish, and release process.

---

## Prerequisites

### Required Access

- [ ] npm account with publish access
- [ ] GitHub repository admin access
- [ ] npm 2FA enabled
- [ ] npm access token configured

### Setup npm Auth
```bash
# Login to npm
npm login

# or
pnpm login

# Verify login
npm whoami

# or
pnpm whoami

# Create access token (automation)
npm token create --read-only

# or
pnpm token create --read-only
```

---

## Build Process

### Development Build
```bash
# Clean previous builds
npm run clean

# or
pnpm run clean

# Build TypeScript
npm run build

# or
pnpm run build

# Output: dist/ folder
```

**Build Output:**
```
dist/
├── cli/
│   ├── index.js
│   ├── index.d.ts
│   └── commands/
├── loader/
├── generator/
├── routes/
├── server/
└── types/
```

---

### Production Build
```bash
# Full production build
npm run build:prod

# or
pnpm run build:prod

# Includes:
# - TypeScript compilation
# - Minification
# - Source maps
# - Type declarations
```

**`package.json` scripts:**
```json
{
  "scripts": {
    "clean": "rm -rf dist",
    "build": "tsc",
    "build:prod": "npm run clean && tsc --sourceMap false",
    "prepublishOnly": "npm run build:prod && npm test"
  }
}
```

---

## Package Configuration

### package.json
```json
{
  "name": "contour",
  "version": "1.0.0",
  "description": "Professional API mock server from OpenAPI specifications",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "contour": "dist/cli/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "api",
    "mock",
    "openapi",
    "swagger",
    "testing",
    "development",
    "fake-data"
  ],
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/trillionclues/contour.git"
  },
  "bugs": {
    "url": "https://github.com/trillionclues/contour/issues"
  },
  "homepage": "https://github.com/trillionclues/contour#readme",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### .npmignore
```
# Source files
src/
tests/
docs/

# Config files
.github/
.vscode/
.husky/
tsconfig.json
vitest.config.ts
.eslintrc.js
.prettierrc

# Development
*.test.ts
*.spec.ts
coverage/
.env
.env.local

# Git
.git/
.gitignore

# Build artifacts
*.log
node_modules/
```

---

## Version Management

### Bumping Versions
```bash
# Patch (1.0.0 → 1.0.1)
npm version patch -m "chore(release): %s"

# or
pnpm version patch -m "chore(release): %s"

# Minor (1.0.0 → 1.1.0)
npm version minor -m "chore(release): %s"

# or
pnpm version minor -m "chore(release): %s"

# Major (1.0.0 → 2.0.0)
npm version major -m "chore(release): %s"
```

**This creates:**
- Updates `package.json` version
- Creates git commit
- Creates git tag

---

## Publishing to npm (using npm) or pnpm

### Manual Publish
```bash
# 1. Ensure clean working directory
git status

# or
pnpm status

# 2. Run tests
npm test

# or
pnpm test

# 3. Build production
npm run build:prod

# or
pnpm run build:prod

# 4. Dry run (see what will be published)
npm publish --dry-run

# or
pnpm publish --dry-run

# 5. Publish
npm publish

# or
pnpm publish

# 6. Push tags
git push origin main --tags
```

---

### Automated Publish (GitHub Actions)

**`.github/workflows/publish.yml`:**
```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci

      # or

      - name: Install dependencies
        run: pnpm ci
      
      - name: Run tests
        run: npm test

      # or

      - name: Run tests
        run: pnpm test
      
      - name: Build
        run: npm run build:prod

      # or

      - name: Build
        run: pnpm run build:prod
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      # or

      - name: Publish to npm
        run: pnpm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

**Setup:**
1. Create npm access token
2. Add as GitHub secret: `NPM_TOKEN`
3. Push tag to trigger workflow

---

## Release Checklist

### Pre-Release

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] No uncommitted changes
- [ ] Build succeeds
- [ ] Examples tested
- [ ] Breaking changes documented

### Release

- [ ] Create release branch
- [ ] Final testing
- [ ] Merge to main
- [ ] Create and push tag
- [ ] Publish to npm
- [ ] Create GitHub release
- [ ] Update documentation site

### Post-Release

- [ ] Verify npm package
- [ ] Test installation
- [ ] Monitor for issues
- [ ] Announce release
- [ ] Merge back to develop

---

## Creating GitHub Release

### Release Notes Template
```markdown
## Contour v1.2.0

### ✨ New Features
- GraphQL support for schema parsing
- Custom format handlers for specialized data types
- Improved error messages with suggestions

### 🐛 Bug Fixes
- Fixed CORS headers for preflight requests
- Resolved memory leak in data generator
- Corrected path parameter handling

### 📝 Documentation
- Added GraphQL examples
- Updated API reference
- Improved troubleshooting guide

### 🔧 Internal
- Refactored route generator
- Improved test coverage to 95%
- Updated dependencies

### 📦 Installation

\`\`\`bash
npm install -g contour
# or
pnpm install -g contour

npm install --save-dev contour
# or
pnpm install --save-dev contour
\`\`\`

### 🔗 Links
- [Documentation](https://github.com/trillionclues/contour)
- [Changelog](https://github.com/trillionclues/contour/blob/main/CHANGELOG.md)
- [npm Package](https://www.npmjs.com/package/contour)

### ⚠️ Breaking Changes
None in this release.
```

---

## Distribution Channels

### npm Registry

**Primary Distribution:**
```bash
npm install -g contour
```

**Package Page:**
`https://www.npmjs.com/package/contour`

---

### Alternative Registries

**GitHub Packages:**
```yaml
# .github/workflows/publish-github.yml
- name: Publish to GitHub Packages
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Rollback Procedure

### Deprecate Version
```bash
# Deprecate specific version
npm deprecate contour@1.2.0 "Critical bug, use 1.2.1 instead"

# Deprecate all versions
npm deprecate contour "Package deprecated, use @yourorg/contour instead"
```

### Unpublish (within 72 hours)
```bash
# Unpublish specific version
npm unpublish contour@1.2.0

# Unpublish entirely (not recommended)
npm unpublish contour --force
```

**Note:** Unpublishing after 72 hours requires npm support ticket.

---

## Monitoring

### Post-Release Monitoring

**Check npm:**
```bash
# Verify published
npm view contour

# Check downloads
npm view contour versions
```

**GitHub:**
- Monitor issues
- Watch discussions
- Review PRs

**npm Stats:**
- [npm-stat.com/charts.html?package=contour](https://npm-stat.com)
- Track downloads
- Monitor trends

---

## Versioning Strategy

### Semantic Versioning

**MAJOR.MINOR.PATCH**

**MAJOR (1.0.0 → 2.0.0):**
- Breaking API changes
- Removed features
- Major architecture changes

**MINOR (1.0.0 → 1.1.0):**
- New features
- Backward-compatible changes
- Deprecations (without removal)

**PATCH (1.0.0 → 1.0.1):**
- Bug fixes
- Security patches
- Documentation updates
- Performance improvements

---

### Pre-Release Versions

**Alpha:**
```bash
npm version 1.2.0-alpha.1
npm publish --tag alpha
```

**Beta:**
```bash
npm version 1.2.0-beta.1
npm publish --tag beta
```

**Release Candidate:**
```bash
npm version 1.2.0-rc.1
npm publish --tag rc
```

**Install Pre-Release:**
```bash
npm install contour@alpha
npm install contour@beta
npm install contour@rc
```

---

## Backward Compatibility

### Deprecation Process

1. **Mark as Deprecated (Minor Release)**
```typescript
   /**
    * @deprecated Use newFunction() instead. Will be removed in v2.0.0
    */
   export function oldFunction() {
     console.warn('oldFunction is deprecated, use newFunction');
     return newFunction();
   }
```

2. **Document in Changelog**
```markdown
   ### Deprecated
   - `oldFunction()` - Use `newFunction()` instead
```

3. **Keep for 1 Major Version**
   - Deprecated in v1.5.0
   - Removed in v2.0.0

4. **Provide Migration Guide**
```markdown
   ## Migration from v1.x to v2.0
   
   ### Breaking Changes
   
   #### Removed `oldFunction()`
   **Before:**
   \`\`\`typescript
   import { oldFunction } from 'contour';
   oldFunction();
   \`\`\`
   
   **After:**
   \`\`\`typescript
   import { newFunction } from 'contour';
   newFunction();
   \`\`\`
```

---

## Security Releases

### Process

1. **Receive Security Report**
   - Email to security@yourproject.com
   - Verify issue

2. **Create Private Fix**
   - Fix in private branch
   - Test thoroughly
   - Create security advisory

3. **Coordinate Release**
   - Choose release date
   - Prepare patch versions for all affected releases
   - Write security advisory

4. **Release**
   - Publish patch
   - Publish security advisory
   - Notify users

5. **Post-Release**
   - Monitor for issues
   - Answer questions
   - Update documentation

---

## Troubleshooting

### Publish Fails

**Error: "You do not have permission to publish"**
```bash
# Check npm user
npm whoami

# Re-login
npm logout
npm login
```

**Error: "Version already exists"**
```bash
# Bump version
npm version patch
npm publish
```

**Error: "Package name already taken"**
```bash
# Use scoped package
# Update package.json:
{
  "name": "@yourorg/contour"
}

# Publish scoped
npm publish --access public
```

---

### Build Issues

**TypeScript errors:**
```bash
npm run typecheck
# Fix errors, then build
```

**Missing files in package:**
```bash
# Check what will be published
npm pack --dry-run

# Add missing files to package.json "files" array
```

---

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)