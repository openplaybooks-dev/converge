---
name: tests-pass
description: All tests pass
type: cmd
args:
  project_dir:
    type: string
---
cd {{ args.project_dir }} && pnpm test 2>&1 | tail -1 | grep -q -v 'FAIL'
