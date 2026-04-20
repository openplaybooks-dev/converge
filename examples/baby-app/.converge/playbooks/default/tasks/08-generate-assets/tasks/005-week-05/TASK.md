---
id: 005-week-05
title: "Baby Size Week 5: apple seed"
dependencies:
  - 004-05-wire
tags:
  - asset
  - baby-size
  - week-5
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 005
  assetId: week-05
  fileName: week-05.svg
  weekNumber: 5
  comparison: apple seed
  emoji: 🍎
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-05.svg
  assetTaskId: 005-week-05
  assetLabel: Week 5
  assetWidgetName: Week05
  assetDescription: Week 5 baby size illustration showing a apple seed.
  contextBlock: "**Baby Size Illustration — Week 5**\n- Size comparison: \"apple seed\" 🍎\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a apple seed alongside a gestational sac/fetus at week 5.
  metaTitle: Week 5 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-5\", \"apple seed\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized apple seed (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek05Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 5 — baby is the size of a apple seed.
