---
id: class-warrior
title: Generate warrior class style guide
description: Create style guide and reference for warrior character class
tags:
  - shared
  - class
  - style-guide
outputs:
  - assets/shared/classes/warrior/style-guide.md
  - assets/shared/classes/warrior/reference.png
checks:
  - id: style-guide-exists
    description: Style guide document exists
    cmd: test -s assets/shared/classes/warrior/style-guide.md
  - id: reference-exists
    description: Visual reference exists
    cmd: test -s assets/shared/classes/warrior/reference.png
vars:
  class_name: warrior
  characters: "[\"hero-knight\"]"
  shared_attributes: "{\"armor_type\":\"heavy\",\"weapon_style\":\"melee\",\"color_theme\":\"metallic\",\"movement_style\":\"strong\"}"
---

# Generate warrior Class Style Guide

Create a comprehensive style guide and visual reference for the warrior character class.

## Class Details

- **Class Name**: warrior
- **Characters**: ["hero-knight"]
- **Shared Attributes**: {"armor_type":"heavy","weapon_style":"melee","color_theme":"metallic","movement_style":"strong"}

## Task

Generate style guide document and visual reference that defines:
- Visual style and aesthetic
- Color palette
- Material types (armor, clothing, weapons)
- Common design elements
- Animation style

## Style Guide Document

Create `assets/shared/classes/warrior/style-guide.md`:

```markdown
# warrior Class Style Guide

## Overview
[Description of class visual identity]

## Color Palette
[Primary and secondary colors]

## Materials
[Armor type, clothing, weapon materials]

## Design Elements
[Common visual elements across all warrior characters]

## Animation Style
[Movement characteristics, pose style]

## Characters in Class
["hero-knight"]
```

## Visual Reference

Generate `assets/shared/classes/warrior/reference.png`:
- Representative visual showing class style
- Key design elements highlighted
- Color palette demonstration

## Verification

- Style guide document is comprehensive
- Visual reference clearly shows class identity
- Can be used as reference for all characters in this class
