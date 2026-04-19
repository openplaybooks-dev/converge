---
id: 027-week-27
title: "Baby Size Week 27: cauliflower"
dependencies:
  - 026-05-wire
tags:
  - asset
  - baby-size
  - week-27
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 027
  assetId: week-27
  fileName: week-27.svg
  weekNumber: 27
  comparison: cauliflower
  emoji: 🥦
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-27.svg
  assetTaskId: 027-week-27
  assetLabel: Week 27
  assetWidgetName: Week27
  assetDescription: Week 27 baby size illustration showing a cauliflower.
  contextBlock: "**Baby Size Illustration — Week 27**\n- Size comparison: \"cauliflower\" 🥦\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a cauliflower alongside a gestational sac/fetus at week 27.
  metaTitle: Week 27 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-27\", \"cauliflower\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized cauliflower (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek27Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 27 — baby is the size of a cauliflower.
