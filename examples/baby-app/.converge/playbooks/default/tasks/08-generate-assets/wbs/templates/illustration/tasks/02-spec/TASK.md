---
id: "{{prefix}}-02-spec"
title: "Spec — {{assetType}}: {{assetLabel}}"
description: Create detailed visual specification for the asset
dependencies:
  - "{{prefix}}-01-analyze"
skill: visual-specification
blocking: true
tags:
  - asset
  - spec
  - "{{assetType}}"
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/SPEC.md
checks:
  - id: spec-exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/SPEC.md
    description: Visual specification document exists
---

# Create Visual Specification

Write a detailed visual specification for generating this asset.

## From Requirements

Read `requirements.json` from the previous step.

## Specification Tasks

1. **Composition** — Layout, positioning, framing
2. **Colors** — Specific hex values from design system
3. **Shapes** — Geometric forms, organic shapes
4. **Details** — Textures, patterns, highlights
5. **Style Guide** — Flat, 3D, line art, etc.

## Output

Create `SPEC.md` with these sections:

```markdown
# Asset Specification: {{assetId}}

## Overview
{{specOverview}}

## Visual Description
[Detailed description for SVG generation]

## Color Palette
- Primary: #FF6B6B (coral)
- Secondary: #9B59B6 (lilac)
- Background: transparent

## Dimensions
- ViewBox: 0 0 200 200
- Padding: 10%

## Style Notes
- Line weight: 3px
- Rounded corners: 8px
- Flat design with subtle shadows

## Variants
- Light mode: as specified
- Dark mode: inverted colors
```

Be specific enough that an AI can generate the SVG from this description.
