---
id: 005-split-GeneralSettingsSection
title: "Split: GeneralSettingsSection"
description: Extract GeneralSettingsSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/general_settings_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/general_settings_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/settings/widgets/general_settings_section.dart
vars:
  name: GeneralSettingsSection
  grep: System Permissions
  description: System permissions and do not disturb toggle section
  shared: false
  widgetName: GeneralSettingsSection
  grepString: System Permissions
  widgetPath: lib/screens/settings/widgets/general_settings_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 005-split-GeneralSettingsSection
---

# Split: GeneralSettingsSection

Extract the `GeneralSettingsSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `System Permissions`
2. **Create file** — Write `lib/screens/settings/widgets/general_settings_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `GeneralSettingsSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class GeneralSettingsSection extends StatelessWidget {
  const GeneralSettingsSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
