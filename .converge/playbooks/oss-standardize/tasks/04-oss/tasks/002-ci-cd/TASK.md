---
id: 002-ci-cd
title: Create GitHub Actions workflows
dependencies:
  - 001-community-health
outputs:
  - .github/workflows/ci.yml
checks:
  - id: ci-workflow-exists
    description: CI workflow exists
    cmd: test -f .github/workflows/ci.yml
  - id: ci-workflow-valid
    description: CI workflow has valid YAML header
    cmd: "head -1 .github/workflows/ci.yml | grep -q 'name:'"
---

Create GitHub Actions CI/CD workflows.

**`.github/workflows/ci.yml`** — runs on every push and PR:

```yaml
name: CI
on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - Checkout
      - Setup Node.js
      - Install dependencies
      - Lint
      - Build (all packages)
      - Test (all packages)
      - Type check
```

**Considerations**:
- Use monorepo-aware build (check if turbo, nx, or npm workspaces)
- Cache node_modules for speed
- Run tests with coverage reporting
- Fail fast on lint errors
- Read `package.json` to understand the actual build/test commands
