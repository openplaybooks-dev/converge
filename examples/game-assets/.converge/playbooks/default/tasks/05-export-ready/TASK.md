---
id: 05-export-ready
title: Export Ready — Generate atlas metadata and engine formats
description: Generate atlas metadata (frames.json, atlas.json, atlas.godot.json, atlas.unity.json) for assets/characters/{id}/
dependencies:
  - 04-animation-keyframes
  - 03-object-sheet-gen
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - export
  - atlas
  - godot
  - unity
inputs:
  - assets/sprites.json
  - spritesheets/**/*.png
  - assets/objects/**/*.png
outputs:
  - assets/characters/**/{state}/frames.json
  - assets/characters/**/atlas.json
  - assets/characters/**/atlas.godot.json
  - assets/characters/**/atlas.unity.json
checks:
  - id: atlas-json-exists
    cmd: node -e "const fs=require('fs');const p='assets/characters';if(!fs.existsSync(p)){console.error('no characters dir');process.exit(1)}const ds=fs.readdirSync(p);const e=ds.some(d=>fs.existsSync('assets/characters/'+d+'/atlas.json'));if(!e){console.error('no atlas.json');process.exit(1)}console.log('ok')"
    description: Atlas JSON exists for at least one character
---

# Export Ready

Generate atlas metadata and engine-specific formats for assembled sprite sheets.

## Output Structure

```
assets/characters/{char_id}/
  {state}/
    frames.json      # frame coordinate metadata
  atlas.json         # engine-agnostic atlas
  atlas.godot.json   # Godot SpriteFrames format
  atlas.unity.json   # Unity SpriteAtlas format
```

## Atlas JSON Schema (atlas.json)

```json
{
  "frames": [
    {
      "filename": "idle_000.png",
      "frame": { "x": 0, "y": 0, "w": 128, "h": 128 }
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
  "animations": [
    { "name": "idle", "frames": [...], "loop": true },
    { "name": "walk", "frames": [...], "loop": true }
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