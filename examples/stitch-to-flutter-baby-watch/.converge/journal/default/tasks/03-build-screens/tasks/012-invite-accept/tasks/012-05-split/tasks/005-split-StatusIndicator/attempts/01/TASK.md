# Task: 03-build-screens/012-invite-accept/012-05-split/005-split-StatusIndicator

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