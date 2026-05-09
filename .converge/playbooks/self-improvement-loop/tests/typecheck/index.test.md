---
name: typecheck
description: Verify TypeScript compiles with zero errors
type: cmd
args:
  project_dir:
    type: string
---
cd {{ args.project_dir }} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
