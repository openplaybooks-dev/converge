---
id: 046-02-spec
title: "Spec — icon: Add"
description: Create detailed visual specification for the icon
dependencies:
  - 046-01-analyze
blocking: true
tags:
  - asset
  - spec
  - icon
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/046-icon-action-add/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/046-icon-action-add/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/046-icon-action-add/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 046
  assetId: action-add
  fileName: action-add.svg
  iconName: Add
  category: action
  assetType: icon
  outputPath: assets/icons/action-add.svg
  assetTaskId: 046-icon-action-add
  assetWidgetName: ActionAdd
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
# Asset Specification: action-add

## Overview
action icon representing "Add" for use in action contexts.

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
