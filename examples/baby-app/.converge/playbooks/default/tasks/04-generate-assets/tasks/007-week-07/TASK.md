---
id: 007-week-07
title: "Baby Size Week 7: blueberry"
dependencies:
  - 006-05-wire
tags:
  - asset
  - baby-size
  - week-7
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 007
  assetId: week-07
  fileName: week-07.svg
  weekNumber: 7
  comparison: blueberry
  emoji: 🫐
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-07.svg
  assetTaskId: 007-week-07
  assetLabel: Week 7
  assetWidgetName: Week07
  assetDescription: Week 7 baby size illustration showing a blueberry.
  contextBlock: "**Baby Size Illustration — Week 7**\n- Size comparison: \"blueberry\" 🫐\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a blueberry alongside a gestational sac/fetus at week 7.
  metaTitle: Week 7 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-7\", \"blueberry\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized blueberry (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek07Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 7 — baby is the size of a blueberry.
