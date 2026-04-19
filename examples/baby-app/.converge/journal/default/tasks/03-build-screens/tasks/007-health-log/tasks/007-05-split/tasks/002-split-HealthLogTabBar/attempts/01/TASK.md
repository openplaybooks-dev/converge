# Task: 03-build-screens/007-health-log/007-05-split/002-split-HealthLogTabBar

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