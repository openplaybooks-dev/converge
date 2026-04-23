---
id: 040-week-40
title: "Baby Size Week 40: small pumpkin"
dependencies:
  - 039-05-wire
tags:
  - asset
  - baby-size
  - week-40
  - trimester-3
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 040
  assetId: week-40
  fileName: week-40.svg
  weekNumber: 40
  comparison: small pumpkin
  emoji: 🎃
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-40.svg
  assetTaskId: 040-week-40
  assetLabel: Week 40
  assetWidgetName: Week40
  assetDescription: Week 40 baby size illustration showing a small pumpkin.
  contextBlock: "**Baby Size Illustration — Week 40**\n- Size comparison: \"small pumpkin\" 🎃\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a small pumpkin alongside a gestational sac/fetus at week 40.
  metaTitle: Week 40 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-40\", \"small pumpkin\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized small pumpkin (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek40Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 40 — baby is the size of a small pumpkin.
