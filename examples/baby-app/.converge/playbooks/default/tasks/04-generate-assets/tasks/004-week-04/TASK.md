---
id: 004-week-04
title: "Baby Size Week 4: poppy seed"
dependencies:
  - 003-05-wire
tags:
  - asset
  - baby-size
  - week-4
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 004
  assetId: week-04
  fileName: week-04.svg
  weekNumber: 4
  comparison: poppy seed
  emoji: 🌱
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-04.svg
  assetTaskId: 004-week-04
  assetLabel: Week 4
  assetWidgetName: Week04
  assetDescription: Week 4 baby size illustration showing a poppy seed.
  contextBlock: "**Baby Size Illustration — Week 4**\n- Size comparison: \"poppy seed\" 🌱\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a poppy seed alongside a gestational sac/fetus at week 4.
  metaTitle: Week 4 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-4\", \"poppy seed\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized poppy seed (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek04Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 4 — baby is the size of a poppy seed.
