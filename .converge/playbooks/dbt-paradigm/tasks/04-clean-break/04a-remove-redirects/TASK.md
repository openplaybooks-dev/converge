---
title: Delete migration-redirects.ts and redirect logic from main.ts
description: |
  The 23-entry redirect table at packages/cli/src/migration-redirects.ts
  intercepts old command names. Delete it and the redirect check in main.ts.
  Old commands should get "Unknown command."

inputs:
  - packages/cli/src/migration-redirects.ts
  - packages/cli/src/main.ts

outputs:
  - packages/cli/src/main.ts

checks:
  - id: redirects-file-gone
    cmd: test -f packages/cli/src/main.ts && ! test -f packages/cli/src/migration-redirects.ts
    description: migration-redirects.ts deleted.
  - id: no-redirect-logic
    cmd: test -f packages/cli/src/main.ts && ! grep -q 'MIGRATION_REDIRECTS' packages/cli/src/main.ts
    description: Redirect logic removed from main.ts.
  - id: old-commands-fail
    cmd: test -f packages/cli/dist/index.js && node packages/cli/dist/index.js verify 2>&1 | grep -q 'Unknown command'
    description: Old commands now fail with "Unknown command."
  - id: typecheck-green
    cmd: test -f packages/cli/src/main.ts && pnpm --filter @openplaybooks/converge build
    description: Repo typechecks.

skills: []
references:
  - "packages/cli/src/migration-redirects.ts"

vars: {}
dependencies: []
---

# 04a — Remove migration redirects

## Red phase

```bash
test -f packages/cli/src/migration-redirects.ts  # must exist
grep -q 'MIGRATION_REDIRECTS' packages/cli/src/main.ts  # must find it
```

## Green phase

1. Delete `packages/cli/src/migration-redirects.ts`.
2. In `main.ts`, remove the import and the redirect check block (~lines 566-578).
3. Old commands now hit the default "Unknown command" path.

## Done when

All 4 checks pass.
