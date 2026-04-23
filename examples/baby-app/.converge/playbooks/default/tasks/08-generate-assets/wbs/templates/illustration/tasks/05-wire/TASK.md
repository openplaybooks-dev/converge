---
id: "{{prefix}}-05-wire"
title: "Wire — {{assetType}}: {{assetLabel}}"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - "{{prefix}}-04-generate"
skill: flutter-asset-integration
blocking: true
tags:
  - asset
  - wire
  - flutter
  - "{{assetType}}"
inputs:
  - "{{outputPath}}"
  - "{{outputPath}}.meta.json"
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

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/{{assetId}}_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// {{assetDescription}}
class {{assetWidgetName}}Asset extends StatelessWidget {
  const {{assetWidgetName}}Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      '{{outputPath}}',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
```

{{wireInstructions}}

## Verify

Run checks to ensure:
1. Widget compiles without errors
2. Asset displays correctly
3. No placeholder code remains
