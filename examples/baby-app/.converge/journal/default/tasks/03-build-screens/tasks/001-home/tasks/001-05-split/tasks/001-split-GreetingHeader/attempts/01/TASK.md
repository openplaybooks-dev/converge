# Task: 03-build-screens/001-home/001-05-split/001-split-GreetingHeader

# Split: GreetingHeader

Extract the `GreetingHeader` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildGreetingHeader`
2. **Create file** — Write `lib/screens/home/widgets/greeting_header.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `GreetingHeader()` and add import
4. **Verify** — Run `dart analyze --no-fatal-infos` on both files

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