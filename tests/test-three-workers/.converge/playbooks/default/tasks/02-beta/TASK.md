---
id: 02-beta
title: Beta root task
outputs:
  - out/beta.txt
checks:
  - id: beta-output-declared
    cmd: test -n "out/beta.txt"
---

Create `out/beta.txt`.
