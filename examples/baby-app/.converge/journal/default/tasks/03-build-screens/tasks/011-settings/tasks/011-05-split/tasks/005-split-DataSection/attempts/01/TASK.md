# Task: 03-build-screens/011-settings/011-05-split/005-split-DataSection

# Split: DataSection

Extract the `DataSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildDataSection`
2. **Create file** — Write `lib/screens/settings/widgets/data_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `DataSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class DataSection extends StatelessWidget {
  const DataSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```