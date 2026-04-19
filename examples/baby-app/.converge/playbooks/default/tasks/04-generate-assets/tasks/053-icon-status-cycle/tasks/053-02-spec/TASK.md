---
id: 053-02-spec
title: "Spec — icon: Cycle"
description: Create detailed visual specification for the icon
dependencies:
  - 053-01-analyze
blocking: true
tags:
  - asset
  - spec
  - icon
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/053-icon-status-cycle/requirements.json
outputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/053-icon-status-cycle/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/053-icon-status-cycle/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 053
  assetId: status-cycle
  fileName: status-cycle.svg
  iconName: Cycle
  category: status
  assetType: icon
  outputPath: assets/icons/status-cycle.svg
  assetTaskId: 053-icon-status-cycle
  assetWidgetName: StatusCycle
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
# Asset Specification: status-cycle

## Overview
status icon representing "Cycle" for use in status contexts.

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
