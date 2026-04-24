---
id: 001-split-PermissionCard
title: "Split: PermissionCard"
description: Extract PermissionCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/onboarding/onboarding_screen.dart
outputs:
  - lib/screens/onboarding/widgets/permission_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/onboarding/widgets/permission_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/onboarding/widgets/permission_card.dart
vars:
  name: PermissionCard
  grep: "iconBgColor: colorScheme.secondaryContainer"
  description: "Card showing permission request with icon, title, description and optional footnote"
  shared: true
  widgetName: PermissionCard
  grepString: "iconBgColor: colorScheme.secondaryContainer"
  widgetPath: lib/screens/onboarding/widgets/permission_card.dart
  localWidgetsDir: lib/screens/onboarding/widgets
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  screenId: onboarding
  screenTitle: null
  subtaskId: 001-split-PermissionCard
---

# Split: PermissionCard

Extract the `PermissionCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/onboarding/onboarding_screen.dart` using grep string: `iconBgColor: colorScheme.secondaryContainer`
2. **Create file** — Write `lib/screens/onboarding/widgets/permission_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PermissionCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PermissionCard extends StatelessWidget {
  const PermissionCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
