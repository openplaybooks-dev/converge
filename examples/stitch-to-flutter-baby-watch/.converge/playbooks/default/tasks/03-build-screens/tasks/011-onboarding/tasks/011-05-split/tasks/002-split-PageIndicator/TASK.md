---
id: 002-split-PageIndicator
title: "Split: PageIndicator"
description: Extract PageIndicator widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/onboarding/onboarding_screen.dart
outputs:
  - lib/screens/onboarding/widgets/page_indicator.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/onboarding/widgets/page_indicator.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/onboarding/widgets/page_indicator.dart
vars:
  name: PageIndicator
  grep: "_PageIndicator(isActive: true"
  description: Dot indicator for onboarding page navigation
  shared: true
  widgetName: PageIndicator
  grepString: "_PageIndicator(isActive: true"
  widgetPath: lib/screens/onboarding/widgets/page_indicator.dart
  localWidgetsDir: lib/screens/onboarding/widgets
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  screenId: onboarding
  screenTitle: null
  subtaskId: 002-split-PageIndicator
---

# Split: PageIndicator

Extract the `PageIndicator` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/onboarding/onboarding_screen.dart` using grep string: `_PageIndicator(isActive: true`
2. **Create file** — Write `lib/screens/onboarding/widgets/page_indicator.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PageIndicator()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PageIndicator extends StatelessWidget {
  const PageIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
