---
id: spawner
title: Seed script repair test
seeds:
  - type: seed
    name: broken
---

Seed container. The seed script `broken.seed.js` spawns one leaf child task
that creates OUTPUT.txt with content "done".

The seed.js has a deliberate bug that the framework's SeedScriptRepairStrategy
should fix.
