---
id: 012-week-12
title: "Baby Size Week 12: plum"
dependencies:
  - 011-05-wire
tags:
  - asset
  - baby-size
  - week-12
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 012
  assetId: week-12
  fileName: week-12.svg
  weekNumber: 12
  comparison: plum
  emoji: 🍑
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-12.svg
  assetTaskId: 012-week-12
  assetLabel: Week 12
  assetWidgetName: Week12
  assetDescription: Week 12 baby size illustration showing a plum.
  contextBlock: "**Baby Size Illustration — Week 12**\n- Size comparison: \"plum\" 🍑\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a plum alongside a gestational sac/fetus at week 12.
  metaTitle: Week 12 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-12\", \"plum\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized plum (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek12Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 12 — baby is the size of a plum.
