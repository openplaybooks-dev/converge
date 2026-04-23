---
id: 056-01-analyze
title: "Analyze — empty-state: No Data"
description: "Analyze requirements for this asset based on design system, models, and usage context"
blocking: true
tags:
  - asset
  - analyze
  - empty-state
inputs:
  - .stitch/system/DESIGN.md
  - "lib/models/*.dart"
  - "lib/screens/**/*.dart"
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 056
  assetId: empty-data
  fileName: empty-data.svg
  stateName: No Data
  context: lists with no items
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/empty-data.svg
  assetTaskId: 056-empty-empty-data
  assetLabel: No Data
  assetWidgetName: EmptyData
  assetDescription: No Data empty state illustration.
  contextBlock: "**Empty State — No Data**\n- Context: lists with no items\n- Usage: Displayed when lists with no items\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"No Data\" — shown when lists with no items."
  metaTitle: No Data Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"empty-data\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"No Data\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Empty State — No Data**
- Context: lists with no items
- Usage: Displayed when lists with no items
- Style: Friendly, soft colors, encouraging

## Analysis Tasks

1. **Review DESIGN.md** — Extract color palette, corner radius, typography
2. **Check model usage** — How is this asset referenced in code?
3. **Identify constraints** — Dimensions, file format, naming conventions
4. **Define variants** — Light/dark mode, states (active/inactive)

## Output

Create `requirements.json`:

```json
{
  "assetId": "empty-data",
  "assetType": "empty-state",
  "fileName": "empty-data.svg",
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
