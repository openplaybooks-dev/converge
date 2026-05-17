---
title: "Spec — {{assetType}}: {{assetName}}"
description: Create detailed visual specification for generating this asset
blocking: true
tags:
  - asset
  - spec
  - "{{assetType}}"
vars:
  assetId:
  assetType:
  assetName:
  assetCategory:
  assetDescription:
  outputPath:
  format:
  dimensionWidth:
  dimensionHeight:
  contextScreens:
  contextWidget:
  generateGuidelines:
  specPath:
inputs:
  - .stitch/system/DESIGN.md
  - assets.json
outputs:
  - "{{specPath}}"
checks:
  - id: spec-exists
    cmd: "test -f {{specPath}}"
    description: Visual specification document exists
---

# Create Visual Specification

Write a detailed visual specification for generating this asset.

## Asset Info

- **ID:** {{assetId}}
- **Type:** {{assetType}}
- **Name:** {{assetName}}
- **Category:** {{assetCategory}}
- **Description:** {{assetDescription}}
- **Output path:** {{outputPath}}
- **Format:** {{format}}
- **Dimensions:** {{dimensionWidth}}x{{dimensionHeight}}
- **Used in screens:** {{contextScreens}}
- **Used in widget:** {{contextWidget}}

## Generation Guidelines

{{generateGuidelines}}

## Steps

1. **Read DESIGN.md** — Extract the app's color palette, typography, corner radius, and visual style
2. **Compose specification** — Write a detailed visual description covering composition, colors (specific hex values), shapes, style, and any constraints
3. **Include dimensions** — Specify viewBox, padding, and scaling rules

## Output

Create `SPEC.md` at `{{specPath}}` with:

```markdown
# Asset Specification: {{assetId}}

## Overview
[One-paragraph description of the asset]

## Visual Description
[Detailed description sufficient for AI generation — composition, subjects, arrangement]

## Color Palette
[List specific hex colors from the design system]

## Dimensions
- ViewBox: 0 0 {{dimensionWidth}} {{dimensionHeight}}
- Padding: [percentage]

## Style Notes
[Line weight, corner radius, fill style, shadow treatment, etc.]
```

Be specific enough that an AI can generate the asset file from this description alone.
