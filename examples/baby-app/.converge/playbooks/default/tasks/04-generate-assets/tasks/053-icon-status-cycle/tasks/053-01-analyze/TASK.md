---
id: 053-01-analyze
title: "Analyze — icon: Cycle"
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
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/053-icon-status-cycle/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/053-icon-status-cycle/requirements.json
vars:
  skill: asset-requirements-analysis
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

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this icon.

## Context

**Feature Icon — Cycle**
- Category: status
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
  "assetId": "status-cycle",
  "assetType": "icon",
  "fileName": "status-cycle.svg",
  "dimensions": { "width": 24, "height": 24 },
  "style": {
    "strokeWidth": 1.5,
    "strokeCap": "round",
    "strokeJoin": "round",
    "fill": "none",
    "stroke": "currentColor"
  },
  "content": {
    "subject": "Cycle",
    "category": "status"
  },
  "variants": ["light", "dark"],
  "usage": {
    "screens": [],
    "widget": "IconButton"
  }
}
```
