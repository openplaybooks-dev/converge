---
id: 002-spec
title: Child task — creates SPEC.txt
depends_on: []
outputs:
  - SPEC.txt
checks:
  - id: spec-exists
    cmd: test -f SPEC.txt
    description: SPEC.txt exists
---

Create a file called `SPEC.txt` in the project root with the content `technical specification`.
