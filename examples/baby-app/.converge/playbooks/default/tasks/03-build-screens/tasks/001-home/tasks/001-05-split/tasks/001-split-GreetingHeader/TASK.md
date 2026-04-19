---
id: 001-split-GreetingHeader
title: "Split: GreetingHeader"
description: Extract GreetingHeader widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/_widgets/greeting_header.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/_widgets/greeting_header.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/home/_widgets/greeting_header.dart
vars:
  name: GreetingHeader
  grep: _buildGreetingHeader
  description: "Row with user name heading, date caption, and circular avatar with initials"
  shared: true
  widgetName: GreetingHeader
  grepString: _buildGreetingHeader
  widgetPath: lib/screens/home/_widgets/greeting_header.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 001-split-GreetingHeader
---

# Split: GreetingHeader

Extract the `GreetingHeader` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildGreetingHeader`
2. **Create file** — Write `lib/screens/home/_widgets/greeting_header.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `GreetingHeader()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class GreetingHeader extends StatelessWidget {
  const GreetingHeader({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
