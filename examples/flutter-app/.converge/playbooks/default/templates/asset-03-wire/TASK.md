---
title: "Wire — {{assetType}}: {{assetName}}"
description: Wire the generated asset into the Flutter codebase
blocking: true
tags:
  - asset
  - wire
  - flutter
  - "{{assetType}}"
vars:
  assetId:
  assetType:
  assetName:
  assetDescription:
  assetWidgetName:
  dimensionWidth:
  dimensionHeight:
  outputPath:
  wireTargetFile:
  wireAction:
inputs:
  - "{{outputPath}}"
outputs:
  - "lib/widgets/assets/{{assetId}}_asset.dart"
checks:
  - id: widget-exists
    cmd: "test -f lib/widgets/assets/{{assetId}}_asset.dart"
    description: Asset widget was created
  - id: dart-valid
    cmd: "dart analyze lib/widgets/assets/{{assetId}}_asset.dart 2>/dev/null || true"
    description: Generated widget code is valid
---

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Asset Info

- **ID:** {{assetId}}
- **Type:** {{assetType}}
- **Widget name:** {{assetWidgetName}}Asset
- **Asset file:** {{outputPath}}
- **Target file:** {{wireTargetFile}}

## Tasks

### 1. Create Asset Widget

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
      width: width ?? {{dimensionWidth}}.0,
      height: height ?? {{dimensionHeight}}.0,
    );
  }
}
```

### 2. Update pubspec.yaml

Ensure the asset path is listed under `flutter.assets` in `pubspec.yaml` (add if not already present).

### 3. Wire into Usage Site

{{wireAction}}

## Rules

- Only modify the specific usage site — do NOT change layout or add unrelated widgets
- Match existing code style in the target file
- Import the asset widget where needed
- Ensure `flutter_svg` is in `pubspec.yaml` dependencies
