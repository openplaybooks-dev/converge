---
id: 039-week-39
title: "Baby Size Week 39: watermelon"
dependencies:
  - 038-05-wire
tags:
  - asset
  - baby-size
  - week-39
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 039
  assetId: week-39
  fileName: week-39.svg
  weekNumber: 39
  comparison: watermelon
  emoji: 🍉
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-39.svg
  assetTaskId: 039-week-39
  assetLabel: Week 39
  assetWidgetName: Week39
  assetDescription: Week 39 baby size illustration showing a watermelon.
  contextBlock: "**Baby Size Illustration — Week 39**\n- Size comparison: \"watermelon\" 🍉\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a watermelon alongside a gestational sac/fetus at week 39.
  metaTitle: Week 39 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-39\", \"watermelon\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized watermelon (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek39Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 39 — baby is the size of a watermelon.
