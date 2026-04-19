---
id: 044-01-analyze
title: "Analyze — icon: Wellness"
description: Analyze requirements for this icon based on design system and usage context
blocking: true
tags:
  - asset
  - analyze
  - icon
inputs:
  - .stitch/system/DESIGN.md
  - "lib/models/*.dart"
  - "lib/screens/**/*.dart"
outputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/044-icon-nav-wellness/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/044-icon-nav-wellness/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 044
  assetId: nav-wellness
  fileName: nav-wellness.svg
  iconName: Wellness
  category: navigation
  assetType: icon
  outputPath: assets/icons/nav-wellness.svg
  assetTaskId: 044-icon-nav-wellness
  assetWidgetName: NavWellness
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this icon.

## Context

**Feature Icon — Wellness**
- Category: navigation
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
  "assetId": "nav-wellness",
  "assetType": "icon",
  "fileName": "nav-wellness.svg",
  "dimensions": { "width": 24, "height": 24 },
  "style": {
    "strokeWidth": 1.5,
    "strokeCap": "round",
    "strokeJoin": "round",
    "fill": "none",
    "stroke": "currentColor"
  },
  "content": {
    "subject": "Wellness",
    "category": "navigation"
  },
  "variants": ["light", "dark"],
  "usage": {
    "screens": [],
    "widget": "IconButton"
  }
}
```
