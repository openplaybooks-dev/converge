---
description: Verify pnpm install, build, and test still pass after all removals
inputs:
  - package.json
  - pnpm-workspace.yaml
  - packages/
  - tests/
outputs:
  - (none — just verification)
checks:
  - id: install-succeeds
    cmd: pnpm install
  - id: build-succeeds
    cmd: pnpm build
  - id: tests-pass
    cmd: pnpm test
skills: []
references: []
vars: {}
depends_on:
  - 10a-remove-complex-examples
  - 10b-remove-apps-dir
  - 10c-remove-stubs
  - 10d-update-pnpm-workspace
---

Verify the core monorepo still works after stripping examples and apps.

```bash
pnpm install
pnpm build
pnpm test
```

All three must exit 0. If any fail, investigate and fix before this task is complete.
