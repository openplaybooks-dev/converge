---
id: 060-02-spec
title: "Spec — empty-state: Offline"
description: Create detailed visual specification for the asset
dependencies:
  - 060-01-analyze
blocking: true
tags:
  - asset
  - spec
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/060-empty-offline/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/060-empty-offline/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/060-empty-offline/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 060
  assetId: offline
  fileName: offline.svg
  stateName: Offline
  context: no internet connection
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/offline.svg
  assetTaskId: 060-empty-offline
  assetLabel: Offline
  assetWidgetName: Offline
  assetDescription: Offline empty state illustration.
  contextBlock: "**Empty State — Offline**\n- Context: no internet connection\n- Usage: Displayed when no internet connection\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Offline\" — shown when no internet connection."
  metaTitle: Offline Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"offline\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Offline\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
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
# Asset Specification: offline

## Overview
Empty state illustration for "Offline" — shown when no internet connection.

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
