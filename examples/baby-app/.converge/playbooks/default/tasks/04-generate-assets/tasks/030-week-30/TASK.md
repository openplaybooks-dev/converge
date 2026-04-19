---
id: 030-week-30
title: "Baby Size Week 30: cabbage"
dependencies:
  - 029-05-wire
tags:
  - asset
  - baby-size
  - week-30
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 030
  assetId: week-30
  fileName: week-30.svg
  weekNumber: 30
  comparison: cabbage
  emoji: 🥬
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-30.svg
  assetTaskId: 030-week-30
  assetLabel: Week 30
  assetWidgetName: Week30
  assetDescription: Week 30 baby size illustration showing a cabbage.
  contextBlock: "**Baby Size Illustration — Week 30**\n- Size comparison: \"cabbage\" 🥬\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a cabbage alongside a gestational sac/fetus at week 30.
  metaTitle: Week 30 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-30\", \"cabbage\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized cabbage (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek30Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 30 — baby is the size of a cabbage.
