---
id: 052-02-spec
title: "Spec — icon: Weight"
description: Create detailed visual specification for the icon
dependencies:
  - 052-01-analyze
blocking: true
tags:
  - asset
  - spec
  - icon
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/052-icon-status-weight/requirements.json
outputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/052-icon-status-weight/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/052-icon-status-weight/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 052
  assetId: status-weight
  fileName: status-weight.svg
  iconName: Weight
  category: status
  assetType: icon
  outputPath: assets/icons/status-weight.svg
  assetTaskId: 052-icon-status-weight
  assetWidgetName: StatusWeight
---

# Create Visual Specification

Write a detailed visual specification for generating this icon.

## From Requirements

Read `requirements.json` from the previous step.

## Specification Tasks

1. **Composition** — Layout, positioning, framing
2. **Stroke** — Weight, caps, joins
3. **Shapes** — Geometric forms, paths
4. **Clarity** — Recognizable at 24x24px

## Output

Create `SPEC.md` with these sections:

```markdown
# Asset Specification: status-weight

## Overview
status icon representing "Weight" for use in status contexts.

## Visual Description
[Detailed description for SVG generation]

## Stroke
- Weight: 1.5px
- Color: currentColor
- Caps: round
- Joins: round

## Dimensions
- ViewBox: 0 0 24 24
- Padding: 2px

## Style Notes
- Outlined style (not filled)
- Simple, recognizable silhouette
- No fill colors — use currentColor for stroke
```

Be specific enough that an AI can generate the SVG from this description.
