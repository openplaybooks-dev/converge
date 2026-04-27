---
id: class-ranger
title: Generate ranger class style guide
description: Create style guide and reference for ranger character class
tags:
  - shared
  - class
  - style-guide
outputs:
  - assets/shared/classes/ranger/style-guide.md
  - assets/shared/classes/ranger/reference.png
checks:
  - id: style-guide-exists
    description: Style guide document exists
    cmd: test -s assets/shared/classes/ranger/style-guide.md
  - id: reference-exists
    description: Visual reference exists
    cmd: test -s assets/shared/classes/ranger/reference.png
vars:
  class_name: ranger
  characters: "[\"forest-elf\"]"
  shared_attributes: "{\"armor_type\":\"light\",\"weapon_style\":\"ranged\",\"color_theme\":\"natural\",\"movement_style\":\"agile\"}"
---

# Generate ranger Class Style Guide

Create a comprehensive style guide and visual reference for the ranger character class.

## Class Details

- **Class Name**: ranger
- **Characters**: ["forest-elf"]
- **Shared Attributes**: {"armor_type":"light","weapon_style":"ranged","color_theme":"natural","movement_style":"agile"}

## Task

Generate style guide document and visual reference that defines:
- Visual style and aesthetic
- Color palette
- Material types (armor, clothing, weapons)
- Common design elements
- Animation style

## Style Guide Document

Create `assets/shared/classes/ranger/style-guide.md`:

```markdown
# ranger Class Style Guide

## Overview
[Description of class visual identity]

## Color Palette
[Primary and secondary colors]

## Materials
[Armor type, clothing, weapon materials]

## Design Elements
[Common visual elements across all ranger characters]

## Animation Style
[Movement characteristics, pose style]

## Characters in Class
["forest-elf"]
```

## Visual Reference

Generate `assets/shared/classes/ranger/reference.png`:
- Representative visual showing class style
- Key design elements highlighted
- Color palette demonstration

## Verification

- Style guide document is comprehensive
- Visual reference clearly shows class identity
- Can be used as reference for all characters in this class
