---
id: 04-aggregate
title: Aggregate after alpha
depends_on:
  - 01-alpha
outputs:
  - out/aggregate.txt
checks:
  - id: aggregate-output-declared
    cmd: test -n "out/aggregate.txt"
---

Create `out/aggregate.txt` after alpha completes.
