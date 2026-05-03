---
name: file-not-empty
type: cmd
args:
  path:
    type: string
---
test -s {{ args.path }}
