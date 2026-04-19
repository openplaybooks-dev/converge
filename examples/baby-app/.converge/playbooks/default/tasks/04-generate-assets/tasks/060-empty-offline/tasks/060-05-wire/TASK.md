---
id: 060-05-wire
title: "Wire — empty-state: Offline"
description: Wire the generated asset into the Flutter codebase
dependencies:
  - 060-04-generate
blocking: true
tags:
  - asset
  - wire
  - flutter
  - empty-state
inputs:
  - assets/illustrations/empty-states/offline.svg
  - assets/illustrations/empty-states/offline.svg.meta.json
outputs:
  - lib/widgets/assets/offline_asset.dart
checks:
  - id: widget-exists
    description: Asset widget was created
    cmd: test -f lib/widgets/assets/offline_asset.dart
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/offline_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 060
  assetId: offline
  fileName: offline.svg
  stateName: Offline
  context: no internet connection
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/offline.svg
  assetTaskId: 060-empty-offline
  assetLabel: Offline
  assetWidgetName: Offline
  assetDescription: Offline empty state illustration.
  contextBlock: "**Empty State — Offline**\n- Context: no internet connection\n- Usage: Displayed when no internet connection\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Offline\" — shown when no internet connection."
  metaTitle: Offline Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"offline\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Offline\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Wire Asset to Code

Connect the generated asset to the Flutter application.

## Tasks

1. **Create Asset Widget** — Wrapper widget for this asset
2. **Update pubspec.yaml** — Add asset path (if not already present)
3. **Update Usage Sites** — Replace placeholders with actual asset

## Asset Widget

Create `lib/widgets/assets/offline_asset.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Offline empty state illustration.
class OfflineAsset extends StatelessWidget {
  const OfflineAsset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/empty-states/offline.svg',
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
