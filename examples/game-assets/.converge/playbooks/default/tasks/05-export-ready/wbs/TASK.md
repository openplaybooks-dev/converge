---
id: "{{id}}"
title: "{{charName}} - Export Atlas Metadata"
---

# Export Atlas Metadata: {{charName}}

Export frame metadata and atlas JSON files for character `{{charId}}`.

## Steps

1. Run `export_frames_meta.py` to slice sprite sheets and generate frames.json
2. Run `export_metadata.py` to generate atlas files (godot, unity, raw formats)

## Commands

```bash
# Export frame metadata
python3 scripts/export_frames_meta.py "{{charId}}"

# Export atlas metadata for all engines
python3 scripts/export_metadata.py "{{charId}}" characters --engine godot --engine unity --engine raw
```

## Outputs

- `assets/characters/{{charId}}/{state}/frames.json` - Frame coordinate metadata
- `assets/characters/{{charId}}/atlas.json` - Engine-agnostic atlas
- `assets/characters/{{charId}}/atlas.godot.json` - Godot SpriteFrames format
- `assets/characters/{{charId}}/atlas.unity.json` - Unity SpriteAtlas format

## Animation States

{{animationStates}}
