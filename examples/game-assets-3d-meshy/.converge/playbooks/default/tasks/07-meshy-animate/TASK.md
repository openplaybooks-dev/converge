---
title: Meshy Animate
description: WBS — for each (humanoid × declared animation), apply a Meshy animation library clip.
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies: [06-meshy-rig]
tags: [meshy, animate, wbs]
---

# Meshy Animate

Fans out over (character × animation) pairs. For the default cast (5 humanoids × 3 anims each = 15 tasks), each runs `scripts/meshy_step.js <id> animate <name>` which calls `meshy-animate` with the rig task_id and the action_id from a built-in library map (Idle, Walk, Run, Jump, PickUp, Attack, CastSpell, BowDraw, Death).

Output: `assets/characters/<id>/anims/<clip>.glb` per clip.

Cost: 3 Meshy credits per clip. Stub: 0.
