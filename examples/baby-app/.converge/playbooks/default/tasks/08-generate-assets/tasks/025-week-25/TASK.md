---
id: 025-week-25
title: "Baby Size Week 25: rutabaga"
dependencies:
  - 024-05-wire
tags:
  - asset
  - baby-size
  - week-25
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 025
  assetId: week-25
  fileName: week-25.svg
  weekNumber: 25
  comparison: rutabaga
  emoji: 🥔
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-25.svg
  assetTaskId: 025-week-25
  assetLabel: Week 25
  assetWidgetName: Week25
  assetDescription: Week 25 baby size illustration showing a rutabaga.
  contextBlock: "**Baby Size Illustration — Week 25**\n- Size comparison: \"rutabaga\" 🥔\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a rutabaga alongside a gestational sac/fetus at week 25.
  metaTitle: Week 25 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-25\", \"rutabaga\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized rutabaga (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek25Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 25 — baby is the size of a rutabaga.
