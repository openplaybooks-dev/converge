---
id: 002-week-02
title: "Baby Size Week 2: poppy seed"
dependencies:
  - 001-05-wire
tags:
  - asset
  - baby-size
  - week-2
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 002
  assetId: week-02
  fileName: week-02.svg
  weekNumber: 2
  comparison: poppy seed
  emoji: 🌱
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-02.svg
  assetTaskId: 002-week-02
  assetLabel: Week 2
  assetWidgetName: Week02
  assetDescription: Week 2 baby size illustration showing a poppy seed.
  contextBlock: "**Baby Size Illustration — Week 2**\n- Size comparison: \"poppy seed\" 🌱\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a poppy seed alongside a gestational sac/fetus at week 2.
  metaTitle: Week 2 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-2\", \"poppy seed\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized poppy seed (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek02Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 2 — baby is the size of a poppy seed.
