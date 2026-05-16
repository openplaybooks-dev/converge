---
id: parent
title: Seeding parent task
seed:
  mode: cli
---

Level 1 seed container. Emit explicit `converge spawn task` commands only.

- **child-alpha** (level 2) → CLI-seeded child that can spawn grandchild (level 3)
- **child-beta** (level 2) → leaf task, creates beta.txt

The parent itself does NOT create any files — the children do all the work.
Children validate themselves via their own checks.

Commands must define:
- `child-alpha` with `seed: { mode: cli }` and body instructions to spawn `grandchild`
- `child-beta` with outputs/checks for `beta.txt`
