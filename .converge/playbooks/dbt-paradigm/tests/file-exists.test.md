---
name: file-exists
description: File or directory exists with the given test flag
type: cmd
args:
  path:
    type: string
  test_flag:
    type: string
    default: "-f"
---
test {{ args.test_flag }} "{{ args.path }}"
