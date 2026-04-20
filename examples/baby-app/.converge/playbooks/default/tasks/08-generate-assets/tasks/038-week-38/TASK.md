---
id: 038-week-38
title: "Baby Size Week 38: leek"
dependencies:
  - 037-05-wire
tags:
  - asset
  - baby-size
  - week-38
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 038
  assetId: week-38
  fileName: week-38.svg
  weekNumber: 38
  comparison: leek
  emoji: 🥬
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-38.svg
  assetTaskId: 038-week-38
  assetLabel: Week 38
  assetWidgetName: Week38
  assetDescription: Week 38 baby size illustration showing a leek.
  contextBlock: "**Baby Size Illustration — Week 38**\n- Size comparison: \"leek\" 🥬\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a leek alongside a gestational sac/fetus at week 38.
  metaTitle: Week 38 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-38\", \"leek\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized leek (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek38Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 38 — baby is the size of a leek.
