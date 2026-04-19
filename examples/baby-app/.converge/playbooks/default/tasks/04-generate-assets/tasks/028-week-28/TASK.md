---
id: 028-week-28
title: "Baby Size Week 28: eggplant"
dependencies:
  - 027-05-wire
tags:
  - asset
  - baby-size
  - week-28
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 028
  assetId: week-28
  fileName: week-28.svg
  weekNumber: 28
  comparison: eggplant
  emoji: 🍆
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-28.svg
  assetTaskId: 028-week-28
  assetLabel: Week 28
  assetWidgetName: Week28
  assetDescription: Week 28 baby size illustration showing a eggplant.
  contextBlock: "**Baby Size Illustration — Week 28**\n- Size comparison: \"eggplant\" 🍆\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a eggplant alongside a gestational sac/fetus at week 28.
  metaTitle: Week 28 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-28\", \"eggplant\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized eggplant (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek28Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 28 — baby is the size of a eggplant.
