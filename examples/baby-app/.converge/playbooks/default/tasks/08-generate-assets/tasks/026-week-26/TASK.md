---
id: 026-week-26
title: "Baby Size Week 26: scallion"
dependencies:
  - 025-05-wire
tags:
  - asset
  - baby-size
  - week-26
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 026
  assetId: week-26
  fileName: week-26.svg
  weekNumber: 26
  comparison: scallion
  emoji: 🥬
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-26.svg
  assetTaskId: 026-week-26
  assetLabel: Week 26
  assetWidgetName: Week26
  assetDescription: Week 26 baby size illustration showing a scallion.
  contextBlock: "**Baby Size Illustration — Week 26**\n- Size comparison: \"scallion\" 🥬\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a scallion alongside a gestational sac/fetus at week 26.
  metaTitle: Week 26 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-26\", \"scallion\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized scallion (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek26Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 26 — baby is the size of a scallion.
