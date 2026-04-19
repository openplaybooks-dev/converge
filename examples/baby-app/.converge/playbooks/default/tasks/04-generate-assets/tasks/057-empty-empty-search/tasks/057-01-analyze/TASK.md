---
id: 057-01-analyze
title: "Analyze — empty-state: No Search Results"
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
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/057-empty-empty-search/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/057-empty-empty-search/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 057
  assetId: empty-search
  fileName: empty-search.svg
  stateName: No Search Results
  context: search with no matches
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/empty-search.svg
  assetTaskId: 057-empty-empty-search
  assetLabel: No Search Results
  assetWidgetName: EmptySearch
  assetDescription: No Search Results empty state illustration.
  contextBlock: "**Empty State — No Search Results**\n- Context: search with no matches\n- Usage: Displayed when search with no matches\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"No Search Results\" — shown when search with no matches."
  metaTitle: No Search Results Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"empty-search\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"No Search Results\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Empty State — No Search Results**
- Context: search with no matches
- Usage: Displayed when search with no matches
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
  "assetId": "empty-search",
  "assetType": "empty-state",
  "fileName": "empty-search.svg",
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
