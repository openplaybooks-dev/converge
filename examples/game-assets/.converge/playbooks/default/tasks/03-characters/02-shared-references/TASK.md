---
title: Shared References
description: Setup shared references for cross-character assets (classes, styles, groups)
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "03-character-analysis"
tags:
  - shared
  - references
  - classes
---

# Shared References

Setup shared references for cross-character assets based on character analysis. This includes class-specific style guides, shared effects, and common elements.

## Purpose

Generate shared references that multiple characters can use:
- **Class style guides** - Visual style for each character class (warrior, mage, ranger)
- **Shared effects** - Common visual effects (magic glow, armor shine, etc.)
- **Group assets** - Assets shared across character groups

## WBS Process

The WBS script reads `.converge/character-analysis.json` and spawns tasks for each shared reference:

1. For each character class → spawn class style guide task
2. For each shared effect → spawn effect reference task
3. For each group asset → spawn group asset task

## Example Spawned Tasks

For a game with 3 classes:
- `warrior-style-guide` - Heavy armor, metallic materials
- `mage-style-guide` - Flowing robes, magical effects
- `ranger-style-guide` - Light armor, natural materials

## Output Structure

```
assets/shared/
├── classes/
│   ├── warrior/
│   │   ├── style-guide.md
│   │   └── reference.png
│   ├── mage/
│   │   ├── style-guide.md
│   │   └── reference.png
│   └── ranger/
│       ├── style-guide.md
│       └── reference.png
└── effects/
    ├── magic-glow.png
    └── armor-shine.png
```

## Benefits

- **Consistency** - All characters in a class share visual style
- **Efficiency** - Generate shared assets once, reuse for all characters
- **Maintainability** - Update class style affects all characters in that class
