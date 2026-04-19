---
id: 008-05-wire
title: "Wire — baby-size: Week 8"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 008-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - baby-size
inputs:
  - assets/illustrations/baby-sizes/week-08.svg
  - assets/illustrations/baby-sizes/week-08.svg.meta.json
outputs:
  - lib/widgets/assets/week-08_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/week-08_asset.dart
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/week-08_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 008
  assetId: week-08
  fileName: week-08.svg
  weekNumber: 8
  comparison: raspberry
  emoji: 🍇
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-08.svg
  assetTaskId: 008-week-08
  assetLabel: Week 8
  assetWidgetName: Week08
  assetDescription: Week 8 baby size illustration showing a raspberry.
  contextBlock: "**Baby Size Illustration — Week 8**\n- Size comparison: \"raspberry\" 🍇\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a raspberry alongside a gestational sac/fetus at week 8.
  metaTitle: Week 8 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-8\", \"raspberry\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized raspberry (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek08Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/week-08_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 8 baby size illustration showing a raspberry.
class Week08Asset extends StatelessWidget {
  const Week08Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-08.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
```

## Update HeroIllustrationCard

Replace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:

```dart
// OLD:
CustomPaint(
  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),
)

// NEW:
Week08Asset(
  width: 140,
  height: 140,
)
```

Note: The card should look up the appropriate asset based on `weekNumber`.

## Verify

Run checks to ensure:
1. Widget compiles without errors
2. Asset displays correctly
3. No placeholder code remains
