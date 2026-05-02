---
name: no-pattern
description: Pattern must NOT be present in file
type: cmd
args:
  pattern:
    type: string
  path:
    type: string
  grep_args:
    type: string
    default: "-q"
---
! grep {{ args.grep_args }} '{{ args.pattern }}' {{ args.path }}
