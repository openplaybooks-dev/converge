---
id: 045-05-wire
title: "Wire — icon: Learn"
description: Wire the generated icon into the Flutter codebase
dependencies:
  - 045-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - icon
inputs:
  - assets/icons/nav-learn.svg
outputs:
  - lib/widgets/assets/nav-learn_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/nav-learn_asset.dart
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/nav-learn_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 045
  assetId: nav-learn
  fileName: nav-learn.svg
  iconName: Learn
  category: navigation
  assetType: icon
  outputPath: assets/icons/nav-learn.svg
  assetTaskId: 045-icon-nav-learn
  assetWidgetName: NavLearn
---

# Wire Icon to Code

Connect the generated icon to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this icon
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual icon

## Asset Widget

Create `lib/widgets/assets/nav-learn_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Learn icon for navigation usage.
class NavLearnAsset extends StatelessWidget {
  const NavLearnAsset({
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
      'assets/icons/nav-learn.svg',
      width: width ?? 24.0,
      height: height ?? 24.0,
      colorFilter: color != null
        ? ColorFilter.mode(color!, BlendMode.srcIn)
        : null,
    );
  }
}
```

## Usage

Add to navigation or action buttons:

```dart
IconButton(
  icon: NavLearnAsset(
    color: Theme.of(context).iconTheme.color,
  ),
  onPressed: () {},
)
```

## Verify

Run checks to ensure:
1. Widget compiles without errors
2. Asset displays correctly
3. No placeholder code remains
