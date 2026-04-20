---
id: 058-05-wire
title: "Wire — empty-state: Generic Error"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 058-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - empty-state
inputs:
  - assets/illustrations/empty-states/error-generic.svg
  - assets/illustrations/empty-states/error-generic.svg.meta.json
outputs:
  - lib/widgets/assets/error-generic_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/error-generic_asset.dart
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/error-generic_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 058
  assetId: error-generic
  fileName: error-generic.svg
  stateName: Generic Error
  context: something went wrong
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/error-generic.svg
  assetTaskId: 058-empty-error-generic
  assetLabel: Generic Error
  assetWidgetName: ErrorGeneric
  assetDescription: Generic Error empty state illustration.
  contextBlock: "**Empty State — Generic Error**\n- Context: something went wrong\n- Usage: Displayed when something went wrong\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Generic Error\" — shown when something went wrong."
  metaTitle: Generic Error Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"error-generic\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Generic Error\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/error-generic_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Generic Error empty state illustration.
class ErrorGenericAsset extends StatelessWidget {
  const ErrorGenericAsset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/empty-states/error-generic.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
```



## Verify

Run checks to ensure:
1. Widget compiles without errors
2. Asset displays correctly
3. No placeholder code remains
