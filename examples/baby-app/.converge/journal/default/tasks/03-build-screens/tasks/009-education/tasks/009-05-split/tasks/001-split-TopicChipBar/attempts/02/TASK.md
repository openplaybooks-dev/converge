# Task: 03-build-screens/009-education/009-05-split/001-split-TopicChipBar

# Split: TopicChipBar

Extract the `TopicChipBar` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildTopicChips`
2. **Create file** — Write `lib/screens/education/widgets/topic_chip_bar.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TopicChipBar()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TopicChipBar extends StatelessWidget {
  const TopicChipBar({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```