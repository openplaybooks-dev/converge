---
id: parent
title: Seeding parent task
seeds:
  - type: seed
    name: spawn
---

Level 1 seed container. Uses named seed `spawn` (resolves to seeds/spawn.seed.js).

- **child-alpha** (level 2) → seed task, spawns grandchild (level 3)
- **child-beta** (level 2) → leaf task, creates beta.txt

The parent itself does NOT create any files — the children do all the work.
Children validate themselves via their own checks.
