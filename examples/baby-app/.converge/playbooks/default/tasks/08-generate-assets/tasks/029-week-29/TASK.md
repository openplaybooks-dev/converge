---
id: 029-week-29
title: "Baby Size Week 29: butternut squash"
dependencies:
  - 028-05-wire
tags:
  - asset
  - baby-size
  - week-29
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 029
  assetId: week-29
  fileName: week-29.svg
  weekNumber: 29
  comparison: butternut squash
  emoji: 🎃
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-29.svg
  assetTaskId: 029-week-29
  assetLabel: Week 29
  assetWidgetName: Week29
  assetDescription: Week 29 baby size illustration showing a butternut squash.
  contextBlock: "**Baby Size Illustration — Week 29**\n- Size comparison: \"butternut squash\" 🎃\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a butternut squash alongside a gestational sac/fetus at week 29.
  metaTitle: Week 29 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-29\", \"butternut squash\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized butternut squash (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek29Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 29 — baby is the size of a butternut squash.
