---
id: 021-week-21
title: "Baby Size Week 21: carrot"
dependencies:
  - 020-05-wire
tags:
  - asset
  - baby-size
  - week-21
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 021
  assetId: week-21
  fileName: week-21.svg
  weekNumber: 21
  comparison: carrot
  emoji: 🥕
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-21.svg
  assetTaskId: 021-week-21
  assetLabel: Week 21
  assetWidgetName: Week21
  assetDescription: Week 21 baby size illustration showing a carrot.
  contextBlock: "**Baby Size Illustration — Week 21**\n- Size comparison: \"carrot\" 🥕\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a carrot alongside a gestational sac/fetus at week 21.
  metaTitle: Week 21 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-21\", \"carrot\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized carrot (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek21Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 21 — baby is the size of a carrot.
