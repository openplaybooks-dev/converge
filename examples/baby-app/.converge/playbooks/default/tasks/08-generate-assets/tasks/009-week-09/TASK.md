---
id: 009-week-09
title: "Baby Size Week 9: green olive"
dependencies:
  - 008-05-wire
tags:
  - asset
  - baby-size
  - week-9
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 009
  assetId: week-09
  fileName: week-09.svg
  weekNumber: 9
  comparison: green olive
  emoji: 🫒
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-09.svg
  assetTaskId: 009-week-09
  assetLabel: Week 9
  assetWidgetName: Week09
  assetDescription: Week 9 baby size illustration showing a green olive.
  contextBlock: "**Baby Size Illustration — Week 9**\n- Size comparison: \"green olive\" 🫒\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a green olive alongside a gestational sac/fetus at week 9.
  metaTitle: Week 9 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-9\", \"green olive\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized green olive (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek09Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 9 — baby is the size of a green olive.
