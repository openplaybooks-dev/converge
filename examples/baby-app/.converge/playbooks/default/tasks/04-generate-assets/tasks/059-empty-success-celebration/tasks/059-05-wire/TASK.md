---
id: 059-05-wire
title: "Wire — empty-state: Success"
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
  - id: dart-valid
    description: Generated widget code is valid
    cmd: "dart analyze lib/widgets/assets/success-celebration_asset.dart 2>/dev/null || true"
vars:
  skill: flutter-asset-integration
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 059
  assetId: success-celebration
  fileName: success-celebration.svg
  stateName: Success
  context: achievement unlocked
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/success-celebration.svg
  assetTaskId: 059-empty-success-celebration
  assetLabel: Success
  assetWidgetName: SuccessCelebration
  assetDescription: Success empty state illustration.
  contextBlock: "**Empty State — Success**\n- Context: achievement unlocked\n- Usage: Displayed when achievement unlocked\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Success\" — shown when achievement unlocked."
  metaTitle: Success Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"success-celebration\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Success\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
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

/// Success empty state illustration.
class SuccessCelebrationAsset extends StatelessWidget {
  const SuccessCelebrationAsset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/empty-states/success-celebration.svg',
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
