---
id: 011-week-11
title: "Baby Size Week 11: lime"
dependencies:
  - 010-05-wire
tags:
  - asset
  - baby-size
  - week-11
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 011
  assetId: week-11
  fileName: week-11.svg
  weekNumber: 11
  comparison: lime
  emoji: 🍋
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-11.svg
  assetTaskId: 011-week-11
  assetLabel: Week 11
  assetWidgetName: Week11
  assetDescription: Week 11 baby size illustration showing a lime.
  contextBlock: "**Baby Size Illustration — Week 11**\n- Size comparison: \"lime\" 🍋\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a lime alongside a gestational sac/fetus at week 11.
  metaTitle: Week 11 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-11\", \"lime\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized lime (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek11Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 11 — baby is the size of a lime.
