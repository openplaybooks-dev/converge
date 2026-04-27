---
id: "{{char_id}}-spritesheet-{{state_name}}"
title: "Generate {{char_name}} {{state_name}} sprite sheet (video pipeline)"
description: "{{state_description}}"
wbs: wbs/index.js
skills:
  - video-generate
tags:
  - character
  - animation
  - spritesheet
  - video
---

# {{char_name}} {{state_name}} Sprite Sheet (video-based)

Replaces the single-image-gen spritesheet step with a 3-stage video pipeline. Spawns three sequential subtasks:

1. `{{char_id}}-spritesheet-{{state_name}}-video` — generates a short clip from the canonical reference using the active `video-generate` backend.
2. `{{char_id}}-spritesheet-{{state_name}}-extract` — pulls 8 evenly-spaced frames out of the clip and chroma-keys the green background to alpha.
3. `{{char_id}}-spritesheet-{{state_name}}-compose` — composites those frames into the same 4×2 / 1536×1024 sheet + atlas.json schema the export phase already consumes.

Final outputs land in `assets/characters/{{char_id}}/spritesheets/{{state_name}}/` and match the image-gen example exactly, so `07-export` does not need to know which pipeline produced them.
