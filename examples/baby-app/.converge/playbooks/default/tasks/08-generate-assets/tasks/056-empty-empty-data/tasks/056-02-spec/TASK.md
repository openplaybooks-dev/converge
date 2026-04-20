---
id: 056-02-spec
title: "Spec — empty-state: No Data"
description: Create detailed visual specification for the asset
dependencies:
  - 056-01-analyze
blocking: true
tags:
  - asset
  - spec
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 056
  assetId: empty-data
  fileName: empty-data.svg
  stateName: No Data
  context: lists with no items
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/empty-data.svg
  assetTaskId: 056-empty-empty-data
  assetLabel: No Data
  assetWidgetName: EmptyData
  assetDescription: No Data empty state illustration.
  contextBlock: "**Empty State — No Data**\n- Context: lists with no items\n- Usage: Displayed when lists with no items\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"No Data\" — shown when lists with no items."
  metaTitle: No Data Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"empty-data\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"No Data\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
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
# Asset Specification: empty-data

## Overview
Empty state illustration for "No Data" — shown when lists with no items.

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
