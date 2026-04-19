---
id: "{{prefix}}-01-analyze"
title: "Analyze — {{assetType}}: {{assetLabel}}"
description: Analyze requirements for this asset based on design system, models, and usage context
skill: asset-requirements-analysis
blocking: true
tags:
  - asset
  - analyze
  - "{{assetType}}"
inputs:
  - .stitch/system/DESIGN.md
  - lib/models/*.dart
  - lib/screens/**/*.dart
outputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/{{assetTaskId}}/requirements.json
checks:
  - id: requirements-exist
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/{{assetTaskId}}/requirements.json
    description: Requirements analysis document exists
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

{{contextBlock}}

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
  "assetType": "{{assetType}}",
  "fileName": "{{fileName}}",
  "dimensions": { "width": 200, "height": 200 },
  "style": {
    "colorPalette": ["primary", "secondary", "accent"],
    "strokeWidth": 1.5,
    "cornerRadius": "8px"
  },
  "content": {
    "subject": "...",
    "mood": "friendly",
    "background": "transparent"
  },
  "variants": ["light", "dark"],
  "usage": {
    "screens": ["HomeScreen"],
    "widget": "HeroIllustrationCard"
  }
}
```
