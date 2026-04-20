---
id: 040-01-analyze
title: "Analyze — baby-size: Week 40"
description: "Analyze requirements for this asset based on design system, models, and usage context"
blocking: true
tags:
  - asset
  - analyze
  - baby-size
inputs:
  - .stitch/system/DESIGN.md
  - "lib/models/*.dart"
  - "lib/screens/**/*.dart"
  - lib/providers/week_content_provider.dart
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/040-week-40/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/040-week-40/requirements.json
vars:
  skill: asset-requirements-analysis
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context


**Baby Size Illustration — Week 40**
- Size comparison: "small pumpkin" 🎃
- Trimester: 3
- Used in: HeroIllustrationCard on HomeScreen
- Data source: WeekContent.sizeComparison field






## Analysis Tasks

1. **Review DESIGN.md** — Extract color palette, corner radius, typography
2. **Check model usage** — How is this asset referenced in code?
3. **Identify constraints** — Dimensions, file format, naming conventions
4. **Define variants** — Light/dark mode, states (active/inactive)

## Output

Create `requirements.json`:

```json
{
  "assetId": "week-40",
  "assetType": "baby-size",
  "fileName": "week-40.svg",
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
