---
id: "scene-{{scene_id}}-07-preview"
title: "Scene `{{scene_id}}` — composite preview"
description: "Pure compositing: paste bg layers + tiles + props + character into one preview.png for visual QA."
inputs:
  - "assets/scenes/{{scene_id}}/scene.json"
outputs:
  - "assets/scenes/{{scene_id}}/preview.png"
checks:
  - id: scene-preview-exists
    cmd: |
      python -c "from pathlib import Path; p=Path('assets/scenes/{{scene_id}}/preview.png'); assert p.exists() and p.stat().st_size > 1024, f'preview missing or empty: {p}'"
    description: preview.png was written and is not empty
tags:
  - scene
  - "{{scene_id}}"
  - preview
  - qa
---

# Scene `{{scene_id}}` — Composite Preview

Runs `python scripts/build_scene_preview.py {{scene_id}}`.

**No paid API call. Not a playable scene mock-up.** Just a labelled
sheet that lays every generated asset out side-by-side so the user can
confirm they exist, look stylistically coherent, and have correct
transparency before opening Phaser or Godot.

## Layout (top to bottom)

1. **BG STACK** — far + mid + near composited and tiled across the
   canvas width. Catches transparency failures (e.g. forest-near with
   solid blue) and palette clashes between layers.
2. **TILESHEET** — the whole tilesheet scaled to fit. Catches inconsistent
   per-tile palettes and edge mismatches.
3. **PROPS** — every prop's idle frame side-by-side with labels.
   Catches cross-prop style drift (3D metal vs cartoon vs painted).
4. **CHARACTERS** — every character's idle frame side-by-side. Catches
   character-vs-scene style mismatch.

Each row has a label band so the user knows what they're looking at.

## Cost

- 0¢ (no image-gen call)
