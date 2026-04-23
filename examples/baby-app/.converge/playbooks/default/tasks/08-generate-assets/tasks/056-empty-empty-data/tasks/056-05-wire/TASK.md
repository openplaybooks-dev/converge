---
id: 056-05-wire
title: "Wire — empty-state: No Data"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 056-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - empty-state
inputs:
  - assets/illustrations/empty-states/empty-data.svg
  - assets/illustrations/empty-states/empty-data.svg.meta.json
outputs:
  - lib/widgets/assets/empty-data_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/empty-data_asset.dart
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/empty-data_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 056
  assetId: empty-data
  fileName: empty-data.svg
  stateName: No Data
  context: lists with no items
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/empty-data.svg
  assetTaskId: 056-empty-empty-data
  assetLabel: No Data
  assetWidgetName: EmptyData
  assetDescription: No Data empty state illustration.
  contextBlock: "**Empty State — No Data**\n- Context: lists with no items\n- Usage: Displayed when lists with no items\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"No Data\" — shown when lists with no items."
  metaTitle: No Data Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"empty-data\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"No Data\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/empty-data_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// No Data empty state illustration.
class EmptyDataAsset extends StatelessWidget {
  const EmptyDataAsset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/empty-states/empty-data.svg',
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
