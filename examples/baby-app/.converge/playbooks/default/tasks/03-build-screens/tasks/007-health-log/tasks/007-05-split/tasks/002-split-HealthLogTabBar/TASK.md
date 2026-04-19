---
id: 002-split-HealthLogTabBar
title: "Split: HealthLogTabBar"
description: Extract HealthLogTabBar widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/health_log/health_log_screen.dart
outputs:
  - lib/screens/health_log/widgets/health_log_tab_bar.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/health_log/widgets/health_log_tab_bar.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/health_log/widgets/health_log_tab_bar.dart
vars:
  name: HealthLogTabBar
  grep: "indicatorSize: TabBarIndicatorSize.tab"
  description: "Styled tab bar with Visits, Symptoms, and Reminders tabs with icons"
  shared: false
  widgetName: HealthLogTabBar
  grepString: "indicatorSize: TabBarIndicatorSize.tab"
  widgetPath: lib/screens/health_log/widgets/health_log_tab_bar.dart
  localWidgetsDir: lib/screens/health_log/widgets
  screenPath: lib/screens/health_log/health_log_screen.dart
  screenId: health-log
  screenTitle: null
  subtaskId: 002-split-HealthLogTabBar
---

# Split: HealthLogTabBar

Extract the `HealthLogTabBar` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/health_log/health_log_screen.dart` using grep string: `indicatorSize: TabBarIndicatorSize.tab`
2. **Create file** — Write `lib/screens/health_log/widgets/health_log_tab_bar.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HealthLogTabBar()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HealthLogTabBar extends StatelessWidget {
  const HealthLogTabBar({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
