---
id: child-alpha
title: "Seed: child-alpha → grandchild"
description: Level 2 seed task — spawns grandchild via deep-spawn seed
checks:
  - id: grandchild-output
    description: grand.txt exists with correct content (created by grandchild)
    cmd: "test -f grand.txt && grep -q 'grand' grand.txt"
seeds:
  - type: nodejs
    path: .converge/playbooks/default/tasks/seeds/deep-spawn.seed.js
---

This is a level-2 seed task. Your seed script spawns grandchild which creates grand.txt. Do NOT create any files yourself.
