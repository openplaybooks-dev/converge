---
id: class-mage
title: Generate mage class style guide
description: Create style guide and reference for mage character class
tags:
  - shared
  - class
  - style-guide
outputs:
  - assets/shared/classes/mage/style-guide.md
  - assets/shared/classes/mage/reference.png
checks:
  - id: style-guide-exists
    description: Style guide document exists
    cmd: test -s assets/shared/classes/mage/style-guide.md
  - id: reference-exists
    description: Visual reference exists
    cmd: test -s assets/shared/classes/mage/reference.png
vars:
  class_name: mage
  characters: "[\"shadow-mage\"]"
  shared_attributes: "{\"armor_type\":\"robes\",\"weapon_style\":\"staff\",\"color_theme\":\"magical\",\"movement_style\":\"flowing\"}"
---

# Generate mage Class Style Guide

Create a comprehensive style guide and visual reference for the mage character class.

## Class Details

- **Class Name**: mage
- **Characters**: ["shadow-mage"]
- **Shared Attributes**: {"armor_type":"robes","weapon_style":"staff","color_theme":"magical","movement_style":"flowing"}

## Task

Generate style guide document and visual reference that defines:
- Visual style and aesthetic
- Color palette
- Material types (armor, clothing, weapons)
- Common design elements
- Animation style

## Style Guide Document

Create `assets/shared/classes/mage/style-guide.md`:

```markdown
# mage Class Style Guide

## Overview
[Description of class visual identity]

## Color Palette
[Primary and secondary colors]

## Materials
[Armor type, clothing, weapon materials]

## Design Elements
[Common visual elements across all mage characters]

## Animation Style
[Movement characteristics, pose style]

## Characters in Class
["shadow-mage"]
```

## Visual Reference

Generate `assets/shared/classes/mage/reference.png`:
- Representative visual showing class style
- Key design elements highlighted
- Color palette demonstration

## Verification

- Style guide document is comprehensive
- Visual reference clearly shows class identity
- Can be used as reference for all characters in this class
