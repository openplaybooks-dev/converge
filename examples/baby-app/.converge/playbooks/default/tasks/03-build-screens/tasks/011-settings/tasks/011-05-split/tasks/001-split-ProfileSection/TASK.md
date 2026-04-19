---
id: 001-split-ProfileSection
title: "Split: ProfileSection"
description: Extract ProfileSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/profile_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/profile_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/profile_section.dart
vars:
  name: ProfileSection
  grep: _buildProfileSection
  description: "Avatar circle with initial, user name, and due date in a card"
  shared: false
  widgetName: ProfileSection
  grepString: _buildProfileSection
  widgetPath: lib/screens/settings/widgets/profile_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 001-split-ProfileSection
---

# Split: ProfileSection

Extract the `ProfileSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildProfileSection`
2. **Create file** — Write `lib/screens/settings/widgets/profile_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ProfileSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ProfileSection extends StatelessWidget {
  const ProfileSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
