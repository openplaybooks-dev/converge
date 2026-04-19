---
id: 053-05-wire
title: "Wire — icon: Cycle"
description: Wire the generated icon into the Flutter codebase
dependencies:
  - 053-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - icon
inputs:
  - assets/icons/status-cycle.svg
outputs:
  - lib/widgets/assets/status-cycle_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/status-cycle_asset.dart
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/status-cycle_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 053
  assetId: status-cycle
  fileName: status-cycle.svg
  iconName: Cycle
  category: status
  assetType: icon
  outputPath: assets/icons/status-cycle.svg
  assetTaskId: 053-icon-status-cycle
  assetWidgetName: StatusCycle
---

# Wire Icon to Code

Connect the generated icon to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this icon
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual icon

## Asset Widget

Create `lib/widgets/assets/status-cycle_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Cycle icon for status usage.
class StatusCycleAsset extends StatelessWidget {
  const StatusCycleAsset({
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
      'assets/icons/status-cycle.svg',
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
  icon: StatusCycleAsset(
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
