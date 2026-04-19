---
id: "{{prefix}}-05-wire"
title: "Wire — icon: {{iconName}}"
description: Wire the generated icon into the Flutter codebase
dependencies:
  - "{{prefix}}-04-generate"
skill: flutter-asset-integration
blocking: true
tags:
  - asset
  - wire
  - flutter
  - icon
inputs:
  - "{{outputPath}}"
outputs:
  - lib/widgets/assets/{{assetId}}_asset.dart
checks:
  - id: widget-exists
    cmd: test -f lib/widgets/assets/{{assetId}}_asset.dart
    description: Asset widget was created
  - id: dart-valid
    cmd: dart analyze lib/widgets/assets/{{assetId}}_asset.dart 2>/dev/null || true
    description: Generated widget code is valid
---

# Wire Icon to Code

Connect the generated icon to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this icon
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual icon

## Asset Widget

Create `lib/widgets/assets/{{assetId}}_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// {{iconName}} icon for {{category}} usage.
class {{assetWidgetName}}Asset extends StatelessWidget {
  const {{assetWidgetName}}Asset({
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
      '{{outputPath}}',
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
  icon: {{assetWidgetName}}Asset(
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
