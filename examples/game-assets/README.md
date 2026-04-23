# Game Assets Generation Example

An example Converge playbook that generates game sprites and assets using Nano-banana (Gemini 2.5 Flash Image).

## Structure

```
game-assets/
├── idea.md                              # User input: character/object descriptions
├── sprites.json                         # Generated: character manifest
├── objects.json                         # Generated: object manifest
├── .converge/playbooks/default/
│   ├── playbook.yml                    # Playbook definition
│   └── tasks/
│       ├── 01-define-assets/            # Parse idea → manifests
│       ├── 02-character-refs/           # Locked character refs
│       ├── 02-object-refs/              # Locked object refs
│       ├── 02-background-refs/          # Locked background refs
│       ├── 03-sprite-sheet-gen/         # Character sprite sheets
│       ├── 03-object-sheet-gen/         # Object sheets
│       ├── 04-animation-keyframes/     # Animation keyframes
│       └── 05-export-ready/             # Atlas export + engine formats
├── scripts/
│   ├── compose_blend.py                 # From cinematic-video-production
│   ├── compose_preview.py               # From cinematic-video-production
│   ├── lib/
│   │   ├── composition.py               # From cinematic-video-production
│   │   └── sprite.py                   # Sprite sheet utilities
│   ├── build-sprite-sheet.py            # Assemble frames into sheet
│   ├── slice-sprites.py                 # Slice sheet into frames
│   └── export_metadata.py               # Generate atlas JSON
└── assets/
    ├── characters/                      # Generated character assets
    ├── objects/                         # Generated object assets
    ├── backgrounds/                     # Generated backgrounds
    └── tile_maps/                      # Generated tilemaps
```

## Usage

1. Edit `idea.md` with your game concept and asset requirements
2. Run the playbook: `conv run` in this directory
3. Generated assets appear in `assets/`

## New Sprite Sheet Generation Flow (Template-Based)

Instead of generating raw frames and assembling, sprite sheets are now generated from a template:

1. **Create template** - `python scripts/create_templates.py --cols 4 --rows 4`
2. **Generate sheet** - AI receives template + atlas spec + ref image
3. **AI fills template** - Completes the sprite sheet following the grid layout
4. **Result** - Properly structured, AI-completed sprite sheet ready for slicing

### Template Generation
```bash
python scripts/create_templates.py --cols 4 --rows 4 --resolution 128
# Creates: assets/global/templates/4x4.png (512x512 blank grid)
```

### Sprite Sheet Generation
```bash
python scripts/generate_sprite_sheet_from_template.py <char_id> <state> [--template 4x4]
```

The AI fills the template grid according to:
- `sprites.json` - character atlas (id, name, palette, frames_per_state, sprites_per_row)
- Reference image - character identity (from `assets/characters/{char_id}/ref.png`)
- Template image - grid layout showing where each frame goes

## Old Flow (Deprecated)
The previous flow generated raw frames then reassembled them. This caused alignment issues.

---

## Configuration

In `playbook.yml` under `vars`:
- `sprite_resolution`: pixels per sprite (64, 128, 256)
- `sprites_per_row`: sprites per sheet row
- `animation_states`: list of animation states to generate
- `engine_targets`: which formats to export (godot, unity, raw)
- `max_characters`: limit character count during testing
- `max_states_per_character`: limit states per character during testing

## Output Formats

### Raw (atlas.json)
```json
{
  "frames": [{"filename": "idle_000.png", "frame": {"x": 0, "y": 0, "w": 128, "h": 128}}],
  "meta": {"sprite_resolution": 128, "category": "characters"}
}
```

### Godot (atlas.godot.json)
SpriteFrames format ready for Godot's AnimatedSprite2D or Sprite2D with frames.

### Unity (atlas.unity.json)
SpriteAtlas format ready for Unity's Sprite Atlas system.