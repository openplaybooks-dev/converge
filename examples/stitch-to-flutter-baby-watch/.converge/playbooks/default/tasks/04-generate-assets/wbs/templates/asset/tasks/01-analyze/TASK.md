---
id: "{{prefix}}-01-analyze"
title: "Analyze — {{assetType}}: {{#if weekNumber}}Week {{weekNumber}}{{else}}{{iconName}}{{stateName}}{{/if}}"
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
{{#if weekNumber}}
  - lib/providers/week_content_provider.dart
{{/if}}
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

{{#if weekNumber}}
**Baby Size Illustration — Week {{weekNumber}}**
- Size comparison: "{{comparison}}" {{emoji}}
- Trimester: {{trimester}}
- Used in: HeroIllustrationCard on HomeScreen
- Data source: WeekContent.sizeComparison field
{{/if}}

{{#if iconName}}
**Feature Icon — {{iconName}}**
- Category: {{category}}
- Usage: Navigation bar, action buttons, or status indicators
- Style: Outlined, 24x24px viewport
{{/if}}

{{#if stateName}}
**Empty State — {{stateName}}**
- Context: {{context}}
- Usage: Displayed when {{context}}
- Style: Friendly, soft colors, encouraging
{{/if}}

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
