---
id: 036-week-36
title: "Baby Size Week 36: romaine lettuce"
dependencies:
  - 035-05-wire
tags:
  - asset
  - baby-size
  - week-36
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 036
  assetId: week-36
  fileName: week-36.svg
  weekNumber: 36
  comparison: romaine lettuce
  emoji: 🥬
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-36.svg
  assetTaskId: 036-week-36
  assetLabel: Week 36
  assetWidgetName: Week36
  assetDescription: Week 36 baby size illustration showing a romaine lettuce.
  contextBlock: "**Baby Size Illustration — Week 36**\n- Size comparison: \"romaine lettuce\" 🥬\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a romaine lettuce alongside a gestational sac/fetus at week 36.
  metaTitle: Week 36 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-36\", \"romaine lettuce\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized romaine lettuce (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek36Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 36 — baby is the size of a romaine lettuce.
