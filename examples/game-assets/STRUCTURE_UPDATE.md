# Asset Directory Structure Update

## New Structure

Characters now follow this organization:

```
assets/characters/{char_id}/
├── SPEC.md                    # Character specification
├── ref/
│   ├── ref.png               # Main reference image (single file)
│   └── angles/               # Angle variations subdirectory
│       ├── front.png
│       ├── side_left.png
│       ├── side_right.png
│       ├── back.png
│       └── angles.json       # Angle metadata
├── variants/                  # Pose/expression variants
│   ├── attack/               # Each variant in own folder
│   │   ├── attack.png
│   │   ├── attack.prompt.txt
│   │   └── attack.seed.txt
│   └── variants.json         # Variants metadata
└── states/                    # Animation states
    └── {state}/
        ├── frames/
        └── {state}.png
```

## Key Changes

1. **ref/ directory**: Now contains only one main reference file (`ref.png`)
2. **ref/angles/**: All angle variations moved to subdirectory
3. **pose/ → variants/**: Renamed for clarity
4. **variants/{name}/**: Each variant in its own subdirectory

## Updated Files

### Scripts
- `scripts/generate_character_angles.py` - Outputs to `ref/angles/`
- `scripts/generate_character_poses.py` - Outputs to `variants/{pose}/`
- `scripts/generate_secondary_refs.py` - Reads from `ref/angles/`, outputs to `variants/{name}/`
- `scripts/generate_frames_individual.py` - Reads angles from `ref/angles/angles.json`

### Playbook Templates
- `.converge/playbooks/default/tasks/03-characters/03-generation/wbs/templates/character/02-angles/TASK.md`
  - Updated outputs to `ref/angles/` paths
- `.converge/playbooks/default/tasks/03-characters/03-generation/wbs/templates/character/03-poses/wbs/templates/pose/TASK.md`
  - Updated outputs to `variants/{pose_name}/` paths

## Migration

Existing assets have been reorganized:
- ✅ forest-elf: pose → variants, angles moved to ref/angles/
- ✅ hero-knight: pose → variants, angles moved to ref/angles/
- ✅ shadow-mage: Already correct (only ref.png)

## Benefits

1. **Cleaner ref/ directory**: Single main reference file
2. **Better organization**: Angles and variants in dedicated subdirectories
3. **Scalability**: Easy to add more variants without cluttering
4. **Consistency**: Each variant type has its own folder structure
