---
title: Meshy Refine (PBR textures)
description: WBS — refine each preview into a PBR-textured model.glb.
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies: [04-meshy-preview]
tags: [meshy, refine, wbs]
---

# Meshy Refine

For every character, calls `meshy-generate` with `mode: "refine"` and `preview_task_id` from the previous step (no re-billing of geometry; only textures generated).

Output: `assets/characters/<id>/model.glb` — a PBR-textured GLB ready for the gallery, rigging, and engine import.

Cost: 10 Meshy credits per character. Stub: 0.
