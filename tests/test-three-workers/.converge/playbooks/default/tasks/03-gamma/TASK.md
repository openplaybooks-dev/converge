---
id: 03-gamma
title: Gamma root task
outputs:
  - out/gamma.txt
checks:
  - id: gamma-output-declared
    cmd: test -n "out/gamma.txt"
---

Create `out/gamma.txt`.
