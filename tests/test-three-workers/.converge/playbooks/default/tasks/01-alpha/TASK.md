---
id: 01-alpha
title: Alpha root task
outputs:
  - out/alpha.txt
checks:
  - id: alpha-output-declared
    cmd: test -n "out/alpha.txt"
---

Create `out/alpha.txt`.
