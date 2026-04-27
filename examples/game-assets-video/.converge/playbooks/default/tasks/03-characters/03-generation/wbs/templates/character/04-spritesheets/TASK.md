---
id: "{{char_id}}-04-spritesheets"
title: "Generate {{char_name}} sprite sheets"
description: "Fan out one sprite-sheet task per animation state"
wbs: wbs/index.js
tags:
  - character
  - animation
  - sprites
---

# {{char_name}} Sprite Sheets

Spawns one shell-WBS subtask per animation state in `{{animation_states}}`. Each subtask runs `scripts/generate_spritesheet.py` once and writes a self-contained folder under `assets/characters/{{char_id}}/spritesheets/{state}/`.

The deliverables for the engine are the sheet PNGs and atlas JSONs in those folders — nothing else needs to be loaded at runtime.
