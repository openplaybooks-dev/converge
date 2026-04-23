---
id: 001-split-ProfileCard
title: "Split: ProfileCard"
description: Extract ProfileCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/profile_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/widgets/profile_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/profile_card.dart
vars:
  name: ProfileCard
  grep: Elena Fisher
  description: "Profile section with avatar, name and premium badge"
  shared: false
  widgetName: ProfileCard
  grepString: Elena Fisher
  widgetPath: lib/screens/settings/widgets/profile_card.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 001-split-ProfileCard
---

# Split: ProfileCard

Extract the `ProfileCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `Elena Fisher`
2. **Create file** — Write `lib/screens/settings/widgets/profile_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ProfileCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ProfileCard extends StatelessWidget {
  const ProfileCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
