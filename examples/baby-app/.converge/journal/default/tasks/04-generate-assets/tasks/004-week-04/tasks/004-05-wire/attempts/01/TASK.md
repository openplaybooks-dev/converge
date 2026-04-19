# Task: 04-generate-assets/004-week-04/004-05-wire

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/week-04_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 4 baby size illustration showing a poppy seed.
class Week04Asset extends StatelessWidget {
  const Week04Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-04.svg',
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
Week04Asset(
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