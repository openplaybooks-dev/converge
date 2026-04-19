---
id: 040-05-wire
title: "Wire — baby-size: Week 40"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 040-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - baby-size
inputs:
  - assets/illustrations/baby-sizes/week-40.svg
  - assets/illustrations/baby-sizes/week-40.svg.meta.json
outputs:
  - lib/widgets/assets/week-40_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/week-40_asset.dart
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/week-40_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
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

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/week-40_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 40 baby size illustration showing a small pumpkin.
class Week40Asset extends StatelessWidget {
  const Week40Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-40.svg',
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
Week40Asset(
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
