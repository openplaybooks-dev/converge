---
id: 058-01-analyze
title: "Analyze — empty-state: Generic Error"
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
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/058-empty-error-generic/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/058-empty-error-generic/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 058
  assetId: error-generic
  fileName: error-generic.svg
  stateName: Generic Error
  context: something went wrong
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/error-generic.svg
  assetTaskId: 058-empty-error-generic
  assetLabel: Generic Error
  assetWidgetName: ErrorGeneric
  assetDescription: Generic Error empty state illustration.
  contextBlock: "**Empty State — Generic Error**\n- Context: something went wrong\n- Usage: Displayed when something went wrong\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Generic Error\" — shown when something went wrong."
  metaTitle: Generic Error Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"error-generic\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Generic Error\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Empty State — Generic Error**
- Context: something went wrong
- Usage: Displayed when something went wrong
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
  "assetId": "error-generic",
  "assetType": "empty-state",
  "fileName": "error-generic.svg",
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
