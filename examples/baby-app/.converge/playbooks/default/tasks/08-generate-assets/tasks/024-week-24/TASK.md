---
id: 024-week-24
title: "Baby Size Week 24: corn"
dependencies:
  - 023-05-wire
tags:
  - asset
  - baby-size
  - week-24
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 024
  assetId: week-24
  fileName: week-24.svg
  weekNumber: 24
  comparison: corn
  emoji: 🌽
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-24.svg
  assetTaskId: 024-week-24
  assetLabel: Week 24
  assetWidgetName: Week24
  assetDescription: Week 24 baby size illustration showing a corn.
  contextBlock: "**Baby Size Illustration — Week 24**\n- Size comparison: \"corn\" 🌽\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a corn alongside a gestational sac/fetus at week 24.
  metaTitle: Week 24 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-24\", \"corn\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized corn (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek24Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 24 — baby is the size of a corn.
