---
title: Meshy Auto-rig
description: WBS — auto-rig every humanoid character via Meshy.
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies: [05-meshy-refine]
tags: [meshy, rig, wbs]
---

# Meshy Auto-rig

For every character with `humanoid: true`, calls `meshy-rig` with the refine task_id. Output: `assets/characters/<id>/rigged.glb` plus `rig_task_id` recorded in `meshy.json` for downstream animation.

Constraints (enforced by Meshy on the real backend):
- ≤ 300k faces
- mesh front must point along +Z
- humanoid topology only

Cost: bundled with downstream animation calls.
