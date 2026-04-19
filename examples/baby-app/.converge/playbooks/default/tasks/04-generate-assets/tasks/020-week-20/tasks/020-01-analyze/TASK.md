---
id: 020-01-analyze
title: "Analyze — baby-size: Week 20"
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
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/020-week-20/requirements.json
checks:
  - id: requirements-exist
    description: Requirements analysis document exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/020-week-20/requirements.json
vars:
  skill: asset-requirements-analysis
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 020
  assetId: week-20
  fileName: week-20.svg
  weekNumber: 20
  comparison: banana
  emoji: 🍌
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-20.svg
  assetTaskId: 020-week-20
  assetLabel: Week 20
  assetWidgetName: Week20
  assetDescription: Week 20 baby size illustration showing a banana.
  contextBlock: "**Baby Size Illustration — Week 20**\n- Size comparison: \"banana\" 🍌\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a banana alongside a gestational sac/fetus at week 20.
  metaTitle: Week 20 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-20\", \"banana\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized banana (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek20Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Baby Size Illustration — Week 20**
- Size comparison: "banana" 🍌
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
  "assetId": "week-20",
  "assetType": "baby-size",
  "fileName": "week-20.svg",
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
