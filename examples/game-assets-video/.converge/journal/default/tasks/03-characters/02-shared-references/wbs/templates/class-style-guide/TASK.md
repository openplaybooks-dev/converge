---
id: "class-{{class_name}}"
title: "Generate {{class_name}} class style guide"
description: "Create style guide and reference for {{class_name}} character class"
outputs:
  - "assets/shared/classes/{{class_name}}/style-guide.md"
  - "assets/shared/classes/{{class_name}}/reference.png"
checks:
  - id: style-guide-exists
    cmd: test -s assets/shared/classes/{{class_name}}/style-guide.md
    description: Style guide document exists
  - id: reference-exists
    cmd: test -s assets/shared/classes/{{class_name}}/reference.png
    description: Visual reference exists
tags:
  - shared
  - class
  - style-guide
---

# Generate {{class_name}} Class Style Guide

Create a comprehensive style guide and visual reference for the {{class_name}} character class.

## Class Details

- **Class Name**: {{class_name}}
- **Characters**: {{characters}}
- **Shared Attributes**: {{shared_attributes}}

## Task

Generate style guide document and visual reference that defines:
- Visual style and aesthetic
- Color palette
- Material types (armor, clothing, weapons)
- Common design elements
- Animation style

## Style Guide Document

Create `assets/shared/classes/{{class_name}}/style-guide.md`:

```markdown
# {{class_name}} Class Style Guide

## Overview
[Description of class visual identity]

## Color Palette
[Primary and secondary colors]

## Materials
[Armor type, clothing, weapon materials]

## Design Elements
[Common visual elements across all {{class_name}} characters]

## Animation Style
[Movement characteristics, pose style]

## Characters in Class
{{characters}}
```

## Visual Reference

Generate `assets/shared/classes/{{class_name}}/reference.png`:
- Representative visual showing class style
- Key design elements highlighted
- Color palette demonstration

## Verification

- Style guide document is comprehensive
- Visual reference clearly shows class identity
- Can be used as reference for all characters in this class
