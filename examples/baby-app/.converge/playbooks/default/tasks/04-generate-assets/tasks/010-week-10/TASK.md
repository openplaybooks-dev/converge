---
id: 010-week-10
title: "Baby Size Week 10: prune"
dependencies:
  - 009-05-wire
tags:
  - asset
  - baby-size
  - week-10
  - trimester-1
vars:
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 010
  assetId: week-10
  fileName: week-10.svg
  weekNumber: 10
  comparison: prune
  emoji: 🫐
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-10.svg
  assetTaskId: 010-week-10
  assetLabel: Week 10
  assetWidgetName: Week10
  assetDescription: Week 10 baby size illustration showing a prune.
  contextBlock: "**Baby Size Illustration — Week 10**\n- Size comparison: \"prune\" 🫐\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a prune alongside a gestational sac/fetus at week 10.
  metaTitle: Week 10 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-10\", \"prune\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized prune (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek10Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

Generate baby size illustration for week 10 — baby is the size of a prune.
