---
name: typecheck
description: TypeScript typecheck passes
type: cmd
args:
  pnpm_args:
    type: string
    default: "-r"
  guard:
    type: string
    default: ""
---
{{ args.guard }}pnpm {{ args.pnpm_args }} typecheck
