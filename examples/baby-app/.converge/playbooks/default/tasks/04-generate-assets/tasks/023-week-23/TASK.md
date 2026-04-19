---
id: 023-week-23
title: "Baby Size Week 23: grapefruit"
dependencies:
  - 022-05-wire
tags:
  - asset
  - baby-size
  - week-23
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 023
  assetId: week-23
  fileName: week-23.svg
  weekNumber: 23
  comparison: grapefruit
  emoji: 🍊
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-23.svg
  assetTaskId: 023-week-23
  assetLabel: Week 23
  assetWidgetName: Week23
  assetDescription: Week 23 baby size illustration showing a grapefruit.
  contextBlock: "**Baby Size Illustration — Week 23**\n- Size comparison: \"grapefruit\" 🍊\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a grapefruit alongside a gestational sac/fetus at week 23.
  metaTitle: Week 23 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-23\", \"grapefruit\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized grapefruit (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek23Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 23 — baby is the size of a grapefruit.
