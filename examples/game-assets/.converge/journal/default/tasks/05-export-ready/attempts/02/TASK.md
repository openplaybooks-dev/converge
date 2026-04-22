# Task: 05-export-ready

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