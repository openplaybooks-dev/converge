---
id: 037-week-37
title: "Baby Size Week 37: swiss chard"
dependencies:
  - 036-05-wire
tags:
  - asset
  - baby-size
  - week-37
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 037
  assetId: week-37
  fileName: week-37.svg
  weekNumber: 37
  comparison: swiss chard
  emoji: 🥬
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-37.svg
  assetTaskId: 037-week-37
  assetLabel: Week 37
  assetWidgetName: Week37
  assetDescription: Week 37 baby size illustration showing a swiss chard.
  contextBlock: "**Baby Size Illustration — Week 37**\n- Size comparison: \"swiss chard\" 🥬\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a swiss chard alongside a gestational sac/fetus at week 37.
  metaTitle: Week 37 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-37\", \"swiss chard\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized swiss chard (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek37Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 37 — baby is the size of a swiss chard.
