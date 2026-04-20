---
id: 018-week-18
title: "Baby Size Week 18: bell pepper"
dependencies:
  - 017-05-wire
tags:
  - asset
  - baby-size
  - week-18
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 018
  assetId: week-18
  fileName: week-18.svg
  weekNumber: 18
  comparison: bell pepper
  emoji: 🫑
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-18.svg
  assetTaskId: 018-week-18
  assetLabel: Week 18
  assetWidgetName: Week18
  assetDescription: Week 18 baby size illustration showing a bell pepper.
  contextBlock: "**Baby Size Illustration — Week 18**\n- Size comparison: \"bell pepper\" 🫑\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a bell pepper alongside a gestational sac/fetus at week 18.
  metaTitle: Week 18 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-18\", \"bell pepper\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized bell pepper (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek18Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 18 — baby is the size of a bell pepper.
