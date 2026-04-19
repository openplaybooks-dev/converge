---
id: 049-02-spec
title: "Spec — icon: Share"
description: Create detailed visual specification for the icon
dependencies:
  - 049-01-analyze
blocking: true
tags:
  - asset
  - spec
  - icon
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/049-icon-action-share/requirements.json
outputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/049-icon-action-share/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/049-icon-action-share/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 049
  assetId: action-share
  fileName: action-share.svg
  iconName: Share
  category: action
  assetType: icon
  outputPath: assets/icons/action-share.svg
  assetTaskId: 049-icon-action-share
  assetWidgetName: ActionShare
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
# Asset Specification: action-share

## Overview
action icon representing "Share" for use in action contexts.

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
