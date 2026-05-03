---
id: parent
title: Seeding parent task
checks:
  - id: all-outputs
    cmd: test -f alpha.txt && test -f beta.txt && test -f gamma.txt
    description: All three output files exist
---

Create three output files with their respective content:
- alpha.txt → "alpha"
- beta.txt → "beta"
- gamma.txt → "gamma"

This simulates a seeding task that produces multiple outputs.
