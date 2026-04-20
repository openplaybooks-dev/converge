---
id: 043-02-spec
title: "Spec — icon: Health"
description: Create detailed visual specification for the icon
dependencies:
  - 043-01-analyze
blocking: true
tags:
  - asset
  - spec
  - icon
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/043-icon-nav-health/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/043-icon-nav-health/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/043-icon-nav-health/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 043
  assetId: nav-health
  fileName: nav-health.svg
  iconName: Health
  category: navigation
  assetType: icon
  outputPath: assets/icons/nav-health.svg
  assetTaskId: 043-icon-nav-health
  assetWidgetName: NavHealth
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
# Asset Specification: nav-health

## Overview
navigation icon representing "Health" for use in navigation contexts.

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
