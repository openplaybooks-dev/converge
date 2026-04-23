---
id: 051-02-spec
title: "Spec — icon: Mood"
description: Create detailed visual specification for the icon
dependencies:
  - 051-01-analyze
blocking: true
tags:
  - asset
  - spec
  - icon
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/051-icon-status-mood/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/051-icon-status-mood/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/051-icon-status-mood/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 051
  assetId: status-mood
  fileName: status-mood.svg
  iconName: Mood
  category: status
  assetType: icon
  outputPath: assets/icons/status-mood.svg
  assetTaskId: 051-icon-status-mood
  assetWidgetName: StatusMood
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
# Asset Specification: status-mood

## Overview
status icon representing "Mood" for use in status contexts.

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
