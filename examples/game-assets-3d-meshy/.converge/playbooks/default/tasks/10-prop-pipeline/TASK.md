---
title: Prop Pipeline (ref → 3D, no rig)
description: WBS — for each environment prop, generate reference image + Meshy preview + Meshy refine. No rig, no animation.
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies: [01-design]
tags: [props, meshy, wbs]
---

# Prop Pipeline

Fans out over `assets/props.json`. For each prop, runs the same image-to-3D chain as characters but skips rigging and animation:

1. `scripts/build_prop_ref.js <id>` — nanobanana, no class anchor (props have no class; use global art direction)
2. `scripts/meshy_step.js <id> preview`
3. `scripts/meshy_step.js <id> refine`

Outputs per prop: `assets/props/<id>/{reference.png, preview.glb, model.glb, meshy.json, SPEC.md}`.

The `meshy_step.js` dispatcher auto-detects whether an id is a character (in `characters.json`) or a prop (in `props.json`) and routes to the correct directory.

Cost: 1 nanobanana + 5cr Meshy preview + 10cr Meshy refine = ~15 Meshy cr per prop. Stub: 0.
