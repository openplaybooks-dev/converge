---
id: parent
title: Seeding parent task
seeds:
  - type: seed
    name: spawn
checks:
  - id: all-outputs
    cmd: test -f beta.txt && test -f grand.txt
    description: beta.txt and grand.txt exist (created by level 2 and level 3 children)
---

Level 1 seed container. Uses named seed `spawn` (resolves to seeds/spawn.seed.js).

- **child-alpha** (level 2) → seed task, spawns grandchild (level 3)
- **child-beta** (level 2) → leaf task, creates beta.txt

The parent itself does NOT create any files — the children do all the work.
