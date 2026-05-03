---
name: tests-green
description: Test suite passes
type: cmd
args:
  pnpm_args:
    type: string
    default: "-r"
  guard:
    type: string
    default: ""
---
{{ args.guard }}pnpm {{ args.pnpm_args }} test
