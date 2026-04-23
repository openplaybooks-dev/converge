---
id: "{{prefix}}-05-wire"
title: "Wire — {{assetType}}: {{#if weekNumber}}Week {{weekNumber}}{{else}}{{iconName}}{{stateName}}{{/if}}"
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
  - {{outputPath}}
  - {{outputPath}}.meta.json
outputs:
  - lib/widgets/assets/{{assetId}}_asset.dart
{{#if weekNumber}}
  - lib/screens/home/_widgets/hero_illustration_card.dart (updated)
{{/if}}
checks:
  - id: widget-exists
    cmd: test -f lib/widgets/assets/{{assetId}}_asset.dart
    description: Asset widget was created
  - id: code-uses-asset
    cmd: "{{#if weekNumber}}grep -q '{{assetId}}' lib/screens/home/_widgets/hero_illustration_card.dart 2>/dev/null || grep -q 'SvgPicture' lib/screens/home/_widgets/hero_illustration_card.dart{{/if}}{{#if iconName}}grep -rq '{{assetId}}' lib/ --include='*.dart' 2>/dev/null | head -1{{/if}}{{#if stateName}}grep -rq '{{assetId}}' lib/ --include='*.dart' 2>/dev/null | head -1{{/if}}"
    description: Asset is referenced in codebase
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

/// {{#if weekNumber}}Week {{weekNumber}} baby size illustration showing a {{comparison}}.{{/if}}
{{#if iconName}}/// {{iconName}} icon for {{category}} usage.{{/if}}
{{#if stateName}}/// {{stateName}} empty state illustration.{{/if}}
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
      '{{outputPath}}',
      width: width ?? {{#if weekNumber}}200.0{{else}}24.0{{/if}},
      height: height ?? {{#if weekNumber}}200.0{{else}}24.0{{/if}},
      {{#if iconName}}colorFilter: color != null 
        ? ColorFilter.mode(color!, BlendMode.srcIn)
        : null,{{/if}}
    );
  }
}
```

{{#if weekNumber}}
## Update HeroIllustrationCard

Replace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:

```dart
// OLD:
CustomPaint(
  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),
)

// NEW:
{{pascalCase assetId}}Asset(
  width: 140,
  height: 140,
)
```

Note: The card should look up the appropriate asset based on `weekNumber`.
{{/if}}

{{#if iconName}}
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
{{/if}}

## Verify

Run checks to ensure:
1. Widget compiles without errors
2. Asset displays correctly
3. No placeholder code remains
