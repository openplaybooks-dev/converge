---
id: "{{prefix}}-01-analyze"
title: "Analyze — icon: {{iconName}}"
description: Analyze requirements for this icon based on design system and usage context
skill: asset-requirements-analysis
blocking: true
tags:
  - asset
  - analyze
  - icon
inputs:
  - .stitch/system/DESIGN.md
  - lib/models/*.dart
  - lib/screens/**/*.dart
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/requirements.json
checks:
  - id: requirements-exist
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/requirements.json
    description: Requirements analysis document exists
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this icon.

## Context

**Feature Icon — {{iconName}}**
- Category: {{category}}
- Usage: Navigation bar, action buttons, or status indicators
- Style: Outlined, 24x24px viewport

## Analysis Tasks

1. **Review DESIGN.md** — Extract color palette, corner radius, typography
2. **Check model usage** — How is this asset referenced in code?
3. **Identify constraints** — Dimensions, file format, naming conventions
4. **Define variants** — Light/dark mode, states (active/inactive)

## Output

Create `requirements.json`:

```json
{
  "assetId": "{{assetId}}",
  "assetType": "icon",
  "fileName": "{{fileName}}",
  "dimensions": { "width": 24, "height": 24 },
  "style": {
    "strokeWidth": 1.5,
    "strokeCap": "round",
    "strokeJoin": "round",
    "fill": "none",
    "stroke": "currentColor"
  },
  "content": {
    "subject": "{{iconName}}",
    "category": "{{category}}"
  },
  "variants": ["light", "dark"],
  "usage": {
    "screens": [],
    "widget": "IconButton"
  }
}
```
