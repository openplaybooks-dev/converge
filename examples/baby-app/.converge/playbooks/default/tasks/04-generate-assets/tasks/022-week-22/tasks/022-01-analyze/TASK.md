---
id: 022-01-analyze
title: "Analyze — baby-size: Week 22"
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
outputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/022-week-22/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/022-week-22/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 022
  assetId: week-22
  fileName: week-22.svg
  weekNumber: 22
  comparison: papaya
  emoji: 🥭
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-22.svg
  assetTaskId: 022-week-22
  assetLabel: Week 22
  assetWidgetName: Week22
  assetDescription: Week 22 baby size illustration showing a papaya.
  contextBlock: "**Baby Size Illustration — Week 22**\n- Size comparison: \"papaya\" 🥭\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a papaya alongside a gestational sac/fetus at week 22.
  metaTitle: Week 22 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-22\", \"papaya\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized papaya (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek22Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Baby Size Illustration — Week 22**
- Size comparison: "papaya" 🥭
- Trimester: 2
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
  "assetId": "week-22",
  "assetType": "baby-size",
  "fileName": "week-22.svg",
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
