---
id: 005-05-wire
title: "Wire — baby-size: Week 5"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 005-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - baby-size
inputs:
  - assets/illustrations/baby-sizes/week-05.svg
  - assets/illustrations/baby-sizes/week-05.svg.meta.json
outputs:
  - lib/widgets/assets/week-05_asset.dart
  - lib/screens/home/_widgets/hero_illustration_card.dart (updated)
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/week-05_asset.dart
  - id: code-uses-asset
    description: Asset is referenced in codebase
    cmd: "grep -q 'week-05' lib/screens/home/_widgets/hero_illustration_card.dart 2>/dev/null || grep -q 'SvgPicture' lib/screens/home/_widgets/hero_illustration_card.dart"
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/week-05_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
---

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/week-05_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 5 baby size illustration showing a apple seed.


class {{pascalCase assetId}}Asset extends StatelessWidget {
  const {{pascalCase assetId}}Asset({
    super.key,
    this.width,
    this.height,
    this.color,
  });

  final double? width;
  final double? height;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-05.svg',
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
{{pascalCase assetId}}Asset(
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
