---
id: "scene-{{scene_id}}-02c-background"
title: "Scene `{{scene_id}}` — parallax backgrounds"
description: "WBS container. Spawns four parallax-stack children (02a-bg-far → 02b-bg-mid → 02c-bg-near → 97-validate-composition). Each child has its own prompt, fitness check, and retry budget. Order is enforced by inputs."
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - "assets/scenes/{{scene_id}}/stage.json"
tags:
  - scene
  - "{{scene_id}}"
  - background
  - container
---

# Scene `{{scene_id}}` — Parallax backgrounds

This is a **container task** with three static children:

1. `02a-bg-far` — back wall (sky → distant landscape → horizon line). Fully opaque.
2. `02b-bg-mid` — mid-distance silhouette band. Transparent above and below.
3. `02c-bg-near` — foreground edge. Content concentrated at the bottom; transparent above.

Each child is a hand-authored static task with its own prompt, references, and fitness check. Order is enforced by declared `inputs:` — bg-mid declares bg-far.png as input, bg-near declares bg-mid.png. The runner serializes far → mid → near naturally.

This parent does not run a script. It exists to group the three layer tasks together in the tree so the journal layout is readable. To add a fourth bg sub-task (e.g. extending a layer wider than native, or adding an animated parallax overlay), drop a new `02d-…` directory next to the existing children — no WBS changes required.
