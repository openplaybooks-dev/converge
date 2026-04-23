---
id: 005-split-StatusIndicator
title: "Split: StatusIndicator"
description: Extract StatusIndicator widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/invite_accept/invite_accept_screen.dart
outputs:
  - lib/screens/invite_accept/widgets/status_indicator.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/invite_accept/widgets/status_indicator.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/invite_accept/widgets/status_indicator.dart
vars:
  name: StatusIndicator
  grep: // Status Indicator
  description: System status indicator at bottom
  shared: false
  widgetName: StatusIndicator
  grepString: // Status Indicator
  widgetPath: lib/screens/invite_accept/widgets/status_indicator.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  screenId: invite-accept
  screenTitle: null
  subtaskId: 005-split-StatusIndicator
---

# Split: StatusIndicator

Extract the `StatusIndicator` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `// Status Indicator`
2. **Create file** — Write `lib/screens/invite_accept/widgets/status_indicator.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `StatusIndicator()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class StatusIndicator extends StatelessWidget {
  const StatusIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
