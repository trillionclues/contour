# GIT WORKFLOW & CONVENTIONS

## Branch Strategy

### Main Branches
```
main
  ↓
develop
  ↓
feature/* or fix/*
```

**Branch Purposes:**
- `main` - Production-ready code, tags for releases
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Critical production fixes
- `release/*` - Release preparation

---

## Branch Naming

### Format
```
<type>/<short-description>
```

### Types

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

### Examples
```bash
feature/graphql-support
fix/cors-headers
docs/update-readme
refactor/data-generator
test/add-e2e-tests
chore/update-dependencies
```

### Rules

- ✅ Lowercase only
- ✅ Hyphens for spaces
- ✅ Descriptive but concise
- ❌ No special characters
- ❌ No uppercase

---

## Commit Messages

### Format (Conventional Commits)
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Formatting (no code change)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance
- `ci` - CI/CD changes

### Scope (Optional)

- `cli` - CLI changes
- `loader` - Spec loader
- `generator` - Data generator
- `server` - Express server
- `routes` - Route generation

### Examples

**✅ Good:**
```
feat(generator): add GraphQL support

- Implement GraphQL schema parser
- Add GraphQL data generator
- Update tests

Closes #123
```
```
fix(cors): correct CORS headers for preflight

Previously, OPTIONS requests were not handled correctly.
Now properly returns CORS headers for all origins.

Fixes #456
```
```
docs(readme): update installation instructions

Add npm and pnpm installation examples.
```

**❌ Bad:**
```
Update stuff
```
```
Fix bug
```
```
WIP
```

### Subject Line Rules

- ✅ Imperative mood ("add" not "added")
- ✅ No period at end
- ✅ Max 50 characters
- ✅ Lowercase
- ❌ Don't start with uppercase

### Body Rules

- ✅ Wrap at 72 characters
- ✅ Explain what and why, not how
- ✅ Reference issues (`Fixes #123`)
- ❌ Don't include implementation details

---

## Pull Request Process

### Creating a PR

1. **Create Branch**
```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
```

2. **Make Changes**
```bash
   # Make changes
   git add .
   git commit -m "feat(scope): description"
```

3. **Push Branch**
```bash
   git push origin feature/my-feature
```

4. **Create PR on GitHub**
   - Base branch: `develop`
   - Compare branch: `feature/my-feature`
   - Fill PR template

---

### PR Template

**`.github/PULL_REQUEST_TEMPLATE.md`:**
```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe the tests you ran:

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added
- [ ] All tests passing
- [ ] No breaking changes (or documented)

## Related Issues

Closes #123
Relates to #456

## Screenshots (if applicable)

[Add screenshots here]
```

---

### PR Review Process

**Reviewers Check:**
1. ✅ Code quality
2. ✅ Test coverage
3. ✅ Documentation
4. ✅ No breaking changes
5. ✅ Follows conventions
6. ✅ Security considerations

**Review Comments:**
- 🔴 **Must Fix** - Blocking issue
- 🟡 **Should Fix** - Strong suggestion
- 🟢 **Nice to Have** - Optional improvement
- 💡 **Question** - Needs clarification

**Approval:**
- Requires 1 approval minimum
- All CI checks must pass
- No unresolved conversations

---

### Merging

**Merge Strategy: Squash and Merge**
```bash
# Squash all commits into one
git merge --squash feature/my-feature
git commit -m "feat(scope): consolidated commit message"
```

**Benefits:**
- Clean git history
- One commit per feature
- Easy to revert

**After Merge:**
```bash
# Delete remote branch
git push origin --delete feature/my-feature

# Delete local branch
git branch -d feature/my-feature
```

---

## Release Process

### Version Numbering (Semantic Versioning)
```
MAJOR.MINOR.PATCH

1.2.3
│ │ │
│ │ └─ Patch: Bug fixes
│ └─── Minor: New features (backward compatible)
└───── Major: Breaking changes
```

### Release Workflow

1. **Create Release Branch**
```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/1.2.0
```

2. **Update Version**
```bash
   npm version 1.2.0 --no-git-tag-version

   # or

   pnpm version 1.2.0 --no-git-tag-version
```

3. **Update Changelog**
```markdown
   # CHANGELOG.md
   
   ## [1.2.0] - 2025-02-09
   
   ### Added
   - GraphQL support
   - Custom format handlers
   
   ### Fixed
   - CORS headers for preflight requests
   
   ### Changed
   - Improved error messages
```

4. **Create PR to Main**
```bash
   git add package.json CHANGELOG.md
   git commit -m "chore(release): prepare 1.2.0"
   git push origin release/1.2.0
```

5. **Merge to Main**
```bash
   # After PR approval
   git checkout main
   git merge --no-ff release/1.2.0
   git tag -a v1.2.0 -m "Release 1.2.0"
   git push origin main --tags
```

6. **Merge Back to Develop**
```bash
   git checkout develop
   git merge --no-ff release/1.2.0
   git push origin develop
```

7. **Delete Release Branch**
```bash
   git branch -d release/1.2.0
   git push origin --delete release/1.2.0
```

---

## Hotfix Process

For critical production bugs:

1. **Create Hotfix Branch**
```bash
   git checkout main
   git checkout -b hotfix/critical-bug
```

2. **Fix and Test**
```bash
   # Make fix
   git commit -m "fix(critical): description"
```

3. **Update Version (Patch)**
```bash
   npm version patch --no-git-tag-version

   # or

   pnpm version patch --no-git-tag-version
```

4. **Merge to Main**
```bash
   git checkout main
   git merge --no-ff hotfix/critical-bug
   git tag -a v1.2.1 -m "Hotfix 1.2.1"
   git push origin main --tags
```

5. **Merge to Develop**
```bash
   git checkout develop
   git merge --no-ff hotfix/critical-bug
   git push origin develop
```

---

## Git Hooks

### Pre-Commit Hook

**`.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linter
npm run lint

# or

pnpm run lint

# Run type check
npm run typecheck

# or

pnpm run typecheck

# Run tests
npm test

# or

pnpm test
```

### Commit Message Hook

**`.husky/commit-msg`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate commit message format
npx commitlint --edit $1

# or

pnpm commitlint --edit $1
```

**`commitlint.config.js`:**
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'ci'
      ]
    ],
    'subject-case': [2, 'always', 'lowercase'],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72]
  }
};
```

---

## Best Practices

### Commit Frequency

- ✅ Commit often (small, logical changes)
- ✅ Each commit should be functional
- ❌ Don't commit broken code
- ❌ Don't commit "WIP" to shared branches

### Branch Hygiene

- ✅ Keep branches short-lived (<1 week)
- ✅ Rebase frequently from develop
- ✅ Delete after merge
- ❌ Don't work directly on develop/main

### Code Review

- ✅ Review within 24 hours
- ✅ Be constructive
- ✅ Test the changes locally
- ❌ Don't approve without reviewing

---

## Troubleshooting

### Merge Conflicts
```bash
# Update your branch
git checkout feature/my-feature
git fetch origin
git rebase origin/develop

# Resolve conflicts
# Edit conflicted files
git add <resolved-files>
git rebase --continue

# Force push (if already pushed)
git push origin feature/my-feature --force-with-lease
```

### Undo Last Commit
```bash
# Keep changes
git reset --soft HEAD~1

# Discard changes
git reset --hard HEAD~1
```

### Rewrite Commit Message
```bash
# Last commit
git commit --amend -m "New message"

# Older commits
git rebase -i HEAD~3
# Mark 'reword' for commits to change
```

---

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)