# Game Assets Playbook

Generate game assets (characters, objects, backgrounds, tile maps) using AI image generation.

## Task Structure

```
tasks/
├── 01-setup-art-style/           # Setup & validation
├── 02-asset-breakdown/           # Generate inventory
└── 03-characters/                # Character pipeline
    ├── 01-analysis/              # Analyze & classify
    ├── 02-shared-references/     # Setup class style guides (WBS)
    └── 03-generation/            # Generate characters (WBS)
```

## Workflow

```bash
# 1. Setup environment
converge run 01-setup-art-style

# 2. Generate asset breakdown
converge run 02-asset-breakdown
cat .converge/asset-breakdown.json

# 3. Character pipeline (3 phases)
converge run 03-characters/01-analysis
cat .converge/character-analysis.json

converge run --wbs 03-characters/02-shared-references
converge run --wbs 03-characters/03-generation
```

## Character Pipeline

1. **Analysis** - Classify characters into classes (warrior, mage, ranger)
2. **Shared References** - Create class-specific style guides
3. **Generation** - Generate all character assets using shared references

## Adding Characters

Add to `assets/sprites.json`:

```json
{
  "id": "new-character",
  "name": "Character Name",
  "description": "Character description with class keywords",
  "palette": "16-bit retro, color scheme",
  "animation_states": ["idle", "walk"]
}
```

Run the pipeline - tasks auto-spawn based on character data.

## Output Structure

```
assets/
├── characters/
│   └── {char_id}/
│       ├── SPEC.md
│       ├── ref/
│       │   ├── front.png
│       │   ├── side_left.png
│       │   ├── side_right.png
│       │   ├── back.png
│       │   └── angles.json
│       ├── pose/
│       │   ├── attack.png
│       │   ├── defend.png
│       │   ├── jump.png
│       │   └── pose.json
│       └── states/
│           ├── idle/
│           │   ├── atlas.json
│           │   ├── idle.png
│           │   └── frames/
│           └── walk/
│               ├── atlas.json
│               ├── walk.png
│               └── frames/
└── shared/
    └── classes/
        ├── warrior/
        │   ├── style-guide.md
        │   └── reference.png
        ├── mage/
        └── ranger/
```

## Future Asset Types

Follow the same 3-phase pattern:

```
04-objects/
├── 01-analysis/
├── 02-shared-references/
└── 03-generation/
```
