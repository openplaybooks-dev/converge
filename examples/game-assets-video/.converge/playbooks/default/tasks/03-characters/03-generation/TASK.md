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

1. **{char_id}-01-spec** — Validate character specification
2. **{char_id}-02-ref** — Generate the canonical reference (source.png + canonical.png) — **1 image-gen call**
3. **{char_id}-03-spritesheets** (WBS) — Spawn one sprite-sheet subtask per animation state. Each subtask is **1 image-gen call**, plus an extra call only when the state's variant ref (see `lib/keyframes.STATE_VARIANT`) doesn't yet exist. Resting states (idle/walk/run) edit the canonical directly with no variant call.

## Output Structure

Every artifact is a self-contained folder with the PNG, the prompt sent to Gemini, and the seed used:

```
assets/characters/{char_id}/
├── ref/
│   ├── source/
│   │   ├── source.png            # high-res original (source_resolution)
│   │   ├── source.prompt.txt
│   │   └── source.seed.txt
│   ├── canonical/
│   │   ├── canonical.png         # downsized working ref (working_resolution)
│   │   └── derived-from.txt
│   └── manifest.json             # locked-viewport contract
├── variants/                       # only created lazily for action states
│   └── {pose}/
│       ├── {pose}.png
│       ├── {pose}.prompt.txt
│       └── {pose}.seed.txt
└── spritesheets/
    ├── idle/
    │   ├── idle.png              # AI-drawn horizontal strip
    │   ├── idle.atlas.json
    │   ├── idle.prompt.txt
    │   └── idle.seed.txt
    └── walk/...
```

## Shared References

Characters use shared references from their class:
- Class style guides for consistent visual identity
- Shared effects for common visual elements
- Group assets for related characters
