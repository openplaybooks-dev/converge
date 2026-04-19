---
id: 031-week-31
title: "Baby Size Week 31: coconut"
dependencies:
  - 030-05-wire
tags:
  - asset
  - baby-size
  - week-31
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 031
  assetId: week-31
  fileName: week-31.svg
  weekNumber: 31
  comparison: coconut
  emoji: 🥥
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-31.svg
  assetTaskId: 031-week-31
  assetLabel: Week 31
  assetWidgetName: Week31
  assetDescription: Week 31 baby size illustration showing a coconut.
  contextBlock: "**Baby Size Illustration — Week 31**\n- Size comparison: \"coconut\" 🥥\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a coconut alongside a gestational sac/fetus at week 31.
  metaTitle: Week 31 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-31\", \"coconut\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized coconut (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek31Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 31 — baby is the size of a coconut.
