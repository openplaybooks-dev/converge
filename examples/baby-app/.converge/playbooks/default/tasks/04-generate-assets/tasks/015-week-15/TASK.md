---
id: 015-week-15
title: "Baby Size Week 15: apple"
dependencies:
  - 014-05-wire
tags:
  - asset
  - baby-size
  - week-15
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 015
  assetId: week-15
  fileName: week-15.svg
  weekNumber: 15
  comparison: apple
  emoji: 🍎
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-15.svg
  assetTaskId: 015-week-15
  assetLabel: Week 15
  assetWidgetName: Week15
  assetDescription: Week 15 baby size illustration showing a apple.
  contextBlock: "**Baby Size Illustration — Week 15**\n- Size comparison: \"apple\" 🍎\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a apple alongside a gestational sac/fetus at week 15.
  metaTitle: Week 15 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-15\", \"apple\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized apple (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek15Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 15 — baby is the size of a apple.
