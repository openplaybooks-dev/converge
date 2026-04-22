---
id: 05-export-ready
title: Export Ready — Slice sheets, generate atlas JSON, engine formats
description: Slice sprite sheets into individual frames, generate atlas metadata (atlas.json, atlas.godot.json, atlas.unity.json), output to assets/{category}/{id}/ with engine-ready formats.
dependencies:
  - 04-animation-keyframes
  - 03-object-sheet-gen
tags:
  - export
  - atlas
  - godot
  - unity
inputs:
  - sprites.json
  - spritesheets/**/{state}.png
  - spritesheets/**/{state}.frames.json
  - objects.json
  - objectsheets/**/*.png
  - keyframes/**/*.png
outputs:
  - assets/characters/**/*.png
  - assets/characters/**/atlas.json
  - assets/characters/**/atlas.godot.json
  - assets/characters/**/atlas.unity.json
  - assets/objects/**/*.png
  - assets/objects/**/atlas.json
  - assets/backgrounds/**/*.png
  - assets/tile_maps/**/*.png
checks:
  - id: assets-generated
    cmd: find assets -name '*.png' -type f | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one asset was exported
  - id: atlas-json-valid
    cmd: node -e "const j=require('./assets/characters');console.log('ok')"
    description: Atlas JSON is valid
---

# Export Ready

Final export phase: slice sprite sheets, generate atlas metadata, and produce engine-specific formats.

## Output Structure

```
assets/characters/{char_id}/
  sprites/              # sliced individual frames
    idle_000.png
    idle_001.png
    ...
  atlas.json           # engine-agnostic atlas
  atlas.godot.json     # Godot SpriteFrames format
  atlas.unity.json     # Unity SpriteAtlas format

assets/objects/{obj_id}/
  sprites/
  atlas.json

assets/backgrounds/{bg_id}/
  ref.png
  atlas.json

assets/tile_maps/{tm_id}/
  sheet.png
  atlas.json
```

## Atlas JSON Schema (atlas.json)

```json
{
  "frames": [
    {
      "filename": "idle_000.png",
      "frame": { "x": 0, "y": 0, "w": 128, "h": 128 },
      "duration": 100
    }
  ],
  "meta": {
    "sprite_resolution": 128,
    "animation_states": ["idle", "walk"]
  }
}
```

## Godot SpriteFrames Format (atlas.godot.json)

```json
{
  "frames": [
    { "name": "idle_000", "texture": "res://assets/characters/hero/sprites/idle_000.png" }
  ],
  "animations": [
    { "name": "idle", "frames": [...], "loop": true }
  ]
}
```

## Unity SpriteAtlas Format (atlas.unity.json)

```json
{
  "sprites": [
    { "name": "idle_000", "rect": { "x": 0, "y": 0, "width": 128, "height": 128 }, "pivot": { "x": 0.5, "y": 0.5 } }
  ],
  "meta": { "spriteResolution": 128, "format": "SpriteAtlas" }
}
```

## Slicing

Use `scripts/slice-sprites.py` to slice sprite sheets:
- Input: spritesheets/{char_id}/{state}.png
- Output: assets/characters/{char_id}/sprites/{state}_{frame}.png

## Engine Targeting

Only generate formats specified in `vars.engine_targets`:
- `raw`: PNG slices + atlas.json
- `godot`: atlas.godot.json (SpriteFrames ready)
- `unity`: atlas.unity.json (SpriteAtlas ready)