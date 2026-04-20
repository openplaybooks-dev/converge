---
id: 057-02-spec
title: "Spec — empty-state: {{iconName}}No Search Results"
description: Create detailed visual specification for the asset
dependencies:
  - 057-01-analyze
blocking: true
tags:
  - asset
  - spec
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/057-empty-empty-search/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/057-empty-empty-search/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/057-empty-empty-search/SPEC.md
vars:
  skill: visual-specification
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
# Asset Specification: empty-search

## Overview



## Visual Description
[Detailed description for SVG generation]

## Color Palette
- Primary: #FF6B6B (coral)
- Secondary: #9B59B6 (lilac)
- Background: transparent

## Dimensions
- ViewBox: 0 0 24 24
- Padding: 10%

## Style Notes
- Line weight: 1.5px
- Rounded corners: 8px
- Flat design with subtle shadows

## Variants
- Light mode: as specified
- Dark mode: inverted colors
```

Be specific enough that an AI can generate the SVG from this description.
