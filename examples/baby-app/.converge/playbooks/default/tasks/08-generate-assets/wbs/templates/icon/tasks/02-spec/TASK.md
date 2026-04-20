---
id: "{{prefix}}-02-spec"
title: "Spec — icon: {{iconName}}"
description: Create detailed visual specification for the icon
dependencies:
  - "{{prefix}}-01-analyze"
skill: visual-specification
blocking: true
tags:
  - asset
  - spec
  - icon
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
# Asset Specification: {{assetId}}

## Overview
{{category}} icon representing "{{iconName}}" for use in {{category}} contexts.

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
