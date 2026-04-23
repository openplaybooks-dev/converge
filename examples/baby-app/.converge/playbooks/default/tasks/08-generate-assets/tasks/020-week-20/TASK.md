---
id: 020-week-20
title: "Baby Size Week 20: banana"
dependencies:
  - 019-05-wire
tags:
  - asset
  - baby-size
  - week-20
  - trimester-2
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 020
  assetId: week-20
  fileName: week-20.svg
  weekNumber: 20
  comparison: banana
  emoji: 🍌
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-20.svg
  assetTaskId: 020-week-20
  assetLabel: Week 20
  assetWidgetName: Week20
  assetDescription: Week 20 baby size illustration showing a banana.
  contextBlock: "**Baby Size Illustration — Week 20**\n- Size comparison: \"banana\" 🍌\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a banana alongside a gestational sac/fetus at week 20.
  metaTitle: Week 20 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-20\", \"banana\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized banana (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek20Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 20 — baby is the size of a banana.
