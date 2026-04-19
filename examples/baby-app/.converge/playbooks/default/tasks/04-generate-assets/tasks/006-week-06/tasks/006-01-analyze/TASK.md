---
id: 006-01-analyze
title: "Analyze — baby-size: Week 6"
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
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/006-week-06/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/006-week-06/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 006
  assetId: week-06
  fileName: week-06.svg
  weekNumber: 6
  comparison: sweet pea
  emoji: 🫛
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-06.svg
  assetTaskId: 006-week-06
  assetLabel: Week 6
  assetWidgetName: Week06
  assetDescription: Week 6 baby size illustration showing a sweet pea.
  contextBlock: "**Baby Size Illustration — Week 6**\n- Size comparison: \"sweet pea\" 🫛\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a sweet pea alongside a gestational sac/fetus at week 6.
  metaTitle: Week 6 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-6\", \"sweet pea\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized sweet pea (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek06Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Baby Size Illustration — Week 6**
- Size comparison: "sweet pea" 🫛
- Trimester: 1
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
  "assetId": "week-06",
  "assetType": "baby-size",
  "fileName": "week-06.svg",
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
