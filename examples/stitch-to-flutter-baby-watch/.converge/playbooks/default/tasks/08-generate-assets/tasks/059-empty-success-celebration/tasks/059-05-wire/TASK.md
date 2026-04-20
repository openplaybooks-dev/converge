---
id: 059-05-wire
title: "Wire — empty-state: {{iconName}}Success"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 059-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - empty-state
inputs:
  - assets/illustrations/empty-states/success-celebration.svg
  - assets/illustrations/empty-states/success-celebration.svg.meta.json
outputs:
  - lib/widgets/assets/success-celebration_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/success-celebration_asset.dart
  - id: code-uses-asset
    description: Asset is referenced in codebase
    cmd: "grep -rq 'success-celebration' lib/ --include='*.dart' 2>/dev/null | head -1"
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/success-celebration_asset.dart 2>/dev/null || true"
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

Create `lib/widgets/assets/success-celebration_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// 

/// Success empty state illustration.
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
      'assets/illustrations/empty-states/success-celebration.svg',
      width: width ?? 24.0,
      height: height ?? 24.0,
      
    );
  }
}
```





## Verify

Run checks to ensure:
1. Widget compiles without errors
2. Asset displays correctly
3. No placeholder code remains
