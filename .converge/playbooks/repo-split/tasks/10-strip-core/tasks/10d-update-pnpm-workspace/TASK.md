---
description: Update pnpm-workspace.yaml to remove apps/* and examples/* from workspace packages
inputs:
  - pnpm-workspace.yaml
outputs:
  - pnpm-workspace.yaml (modified)
checks:
  - id: no-apps-in-workspace
    cmd: grep -v "'apps/" pnpm-workspace.yaml | grep -q . && grep -c "'apps/" pnpm-workspace.yaml || test $? -eq 1
  - id: no-examples-in-workspace
    cmd: grep -c "'examples/" pnpm-workspace.yaml || test $? -eq 1
  - id: packages-still-present
    cmd: grep -q "'packages/\*'" pnpm-workspace.yaml
  - id: tests-still-present
    cmd: grep -q "'tests/test-\*'" pnpm-workspace.yaml
skills: []
references: []
vars: {}
depends_on: []
---

Edit `pnpm-workspace.yaml`. Current content:

```yaml
packages:
  - 'packages/*'
  - 'examples/*'
  - 'apps/*'
  - 'tests/test-*'
```

New content (remove `examples/*` and `apps/*` lines):

```yaml
packages:
  - 'packages/*'
  - 'tests/test-*'
```

Only `packages/*` and `tests/test-*` remain as workspace packages.
