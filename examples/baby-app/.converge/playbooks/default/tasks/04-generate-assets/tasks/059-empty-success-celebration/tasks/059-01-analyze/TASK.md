---
id: 059-01-analyze
title: "Analyze — empty-state: Success"
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
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/059-empty-success-celebration/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/059-empty-success-celebration/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 059
  assetId: success-celebration
  fileName: success-celebration.svg
  stateName: Success
  context: achievement unlocked
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/success-celebration.svg
  assetTaskId: 059-empty-success-celebration
  assetLabel: Success
  assetWidgetName: SuccessCelebration
  assetDescription: Success empty state illustration.
  contextBlock: "**Empty State — Success**\n- Context: achievement unlocked\n- Usage: Displayed when achievement unlocked\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Success\" — shown when achievement unlocked."
  metaTitle: Success Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"success-celebration\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Success\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Empty State — Success**
- Context: achievement unlocked
- Usage: Displayed when achievement unlocked
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
  "assetId": "success-celebration",
  "assetType": "empty-state",
  "fileName": "success-celebration.svg",
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
