---
id: 01-prepare
title: Prepare phase — creates READY.txt
depends_on: []
outputs:
  - READY.txt
checks:
  - id: ready-exists
    cmd: test -f READY.txt
    description: READY.txt exists
---

Create a file called `READY.txt` in the project root with the content `ready`.
