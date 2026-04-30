---
title: Paint Landscape Preview
description: Crop the leftmost 12x12 window from layers/landscape.png (static-only composite), pre-resize to 1024x1024, and AI-paint a finished landscape concept of the first screen.
inputs:
  - "assets/scenes/{{scene_id}}/layers/landscape.png"
  - "assets/ART_BIBLE.md"
outputs:
  - "assets/scenes/{{scene_id}}/samples/landscape/landscape.png"
  - "assets/scenes/{{scene_id}}/samples/landscape/landscape.skeleton.png"
  - "assets/scenes/{{scene_id}}/samples/landscape/landscape.prompt.txt"
---

# 04-preview — landscape concept paint

```bash
python scripts/scene_preview_paint.py {{scene_id}}
```

The previous stage (`03-composite`) produces TWO composites:
- `scene.png` — full composite including dynamic elements (spawn,
  exit, pickups).
- `layers/landscape.png` — static-only composite that swaps in
  `maps/play.landscape.png` (kind=terrain tokens only) for the play
  layer. This is what the painter sees.

`scene_preview_paint.py`:
- Crops the leftmost 12x12-tile window from `layers/landscape.png`
  (960x960 at 80px tiles), pads with the art-bible sky color if the
  scene is narrower than 12 tiles, and pre-resizes to 1024x1024
  with Lanczos. Saves as `samples/landscape/landscape.skeleton.png`.
- Builds a prompt from `assets/ART_BIBLE.md` (the single binding
  art-style document) plus the token list scoped to tokens visible
  in the first window. Writes `samples/landscape/landscape.prompt.txt`.
  The prompt deliberately excludes `idea.md` and
  `visual-target.prompt.txt` — those carry contradicting "16-bit
  pixel" language. ART_BIBLE.md is the single source of truth for
  art style.
- Calls Gemini 2.5 Flash Image (image-edit) with the resized
  skeleton as the base image and NO reference images. The prompt
  alone directs all style; the skeleton anchors composition.
  Output: `samples/landscape/landscape.png` at 1024x1024.

Cost: ~5¢ per scene (Nano-banana image-edit, single call).

Use `--dry-run` to write skeleton + prompt without paying for
image-gen. Use `--force` to regenerate when the output already
exists.

# Fitness checks

- `samples/landscape/landscape.skeleton.png` exists at 1024x1024.
- `samples/landscape/landscape.prompt.txt` exists for traceability.
- `samples/landscape/landscape.png` exists at 1024x1024 (skipped under --dry-run).
