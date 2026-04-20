---
id: 017-week-17
title: "Baby Size Week 17: turnip"
dependencies:
  - 016-05-wire
tags:
  - asset
  - baby-size
  - week-17
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 017
  assetId: week-17
  fileName: week-17.svg
  weekNumber: 17
  comparison: turnip
  emoji: 🥔
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-17.svg
  assetTaskId: 017-week-17
  assetLabel: Week 17
  assetWidgetName: Week17
  assetDescription: Week 17 baby size illustration showing a turnip.
  contextBlock: "**Baby Size Illustration — Week 17**\n- Size comparison: \"turnip\" 🥔\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a turnip alongside a gestational sac/fetus at week 17.
  metaTitle: Week 17 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-17\", \"turnip\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized turnip (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek17Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 17 — baby is the size of a turnip.
