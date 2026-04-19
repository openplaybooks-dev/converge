---
id: 060-01-analyze
title: "Analyze — empty-state: Offline"
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
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/060-empty-offline/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/060-empty-offline/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 060
  assetId: offline
  fileName: offline.svg
  stateName: Offline
  context: no internet connection
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/offline.svg
  assetTaskId: 060-empty-offline
  assetLabel: Offline
  assetWidgetName: Offline
  assetDescription: Offline empty state illustration.
  contextBlock: "**Empty State — Offline**\n- Context: no internet connection\n- Usage: Displayed when no internet connection\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Offline\" — shown when no internet connection."
  metaTitle: Offline Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"offline\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Offline\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Empty State — Offline**
- Context: no internet connection
- Usage: Displayed when no internet connection
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
  "assetId": "offline",
  "assetType": "empty-state",
  "fileName": "offline.svg",
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
