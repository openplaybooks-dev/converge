---
id: 006-split-AboutSection
title: "Split: AboutSection"
description: Extract AboutSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/about_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/about_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/about_section.dart
vars:
  name: AboutSection
  grep: _buildAboutSection
  description: Card with version number display and privacy notice link
  shared: false
  widgetName: AboutSection
  grepString: _buildAboutSection
  widgetPath: lib/screens/settings/widgets/about_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 006-split-AboutSection
---

# Split: AboutSection

Extract the `AboutSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildAboutSection`
2. **Create file** — Write `lib/screens/settings/widgets/about_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `AboutSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class AboutSection extends StatelessWidget {
  const AboutSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
