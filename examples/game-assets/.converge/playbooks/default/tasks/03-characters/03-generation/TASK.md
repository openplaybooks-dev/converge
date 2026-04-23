---
title: Character Generation
description: Generate all character assets using shared references
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "03-characters/02-shared-references"
tags:
  - characters
  - generation
outputs: []
---

# Character Generation

Generate complete asset pipelines for all characters, utilizing shared references from classes and groups.

## WBS Process

For each character in sprites.json, spawn a complete pipeline:

1. **{char_id}-01-spec** - Generate/validate specification document
2. **{char_id}-02-angles** - Generate primary angle references
3. **{char_id}-03-poses** (WBS) - Spawn pose variation tasks
4. **{char_id}-04-states** (WBS) - Spawn animation state tasks

## Output Structure

```
assets/characters/{char_id}/
├── SPEC.md
├── ref/
│   ├── ref.png (main reference)
│   └── angles/
│       ├── front.png
│       ├── side_left.png
│       ├── side_right.png
│       ├── back.png
│       └── angles.json
├── variants/
│   ├── attack/
│   │   └── attack.png
│   ├── defend/
│   │   └── defend.png
│   └── variants.json
└── states/
    ├── idle/
    │   ├── atlas.json
    │   ├── idle.png
    │   └── frames/
    └── walk/
        ├── atlas.json
        ├── walk.png
        └── frames/
```

## Shared References

Characters use shared references from their class:
- Class style guides for consistent visual identity
- Shared effects for common visual elements
- Group assets for related characters
