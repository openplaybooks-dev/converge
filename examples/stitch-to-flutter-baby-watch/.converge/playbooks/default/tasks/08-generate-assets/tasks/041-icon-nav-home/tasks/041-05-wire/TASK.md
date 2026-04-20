---
id: 041-05-wire
title: "Wire — icon: Home{{stateName}}"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 041-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - icon
inputs:
  - assets/icons/nav-home.svg
  - assets/icons/nav-home.svg.meta.json
outputs:
  - lib/widgets/assets/nav-home_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/nav-home_asset.dart
  - id: code-uses-asset
    description: Asset is referenced in codebase
    cmd: "grep -rq 'nav-home' lib/ --include='*.dart' 2>/dev/null | head -1"
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/nav-home_asset.dart 2>/dev/null || true"
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

Create `lib/widgets/assets/nav-home_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// 
/// Home icon for navigation usage.

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
      'assets/icons/nav-home.svg',
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
  icon: {{pascalCase assetId}}Asset(
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
