---
id: "{{subtaskId}}"
title: "Split: {{widgetName}}"
description: "Extract {{widgetName}} widget from {{screenTitle}} screen"
tags:
  - split
  - widget
inputs:
  - "{{screenPath}}"
checks:
  - id: widget-exists
    cmd: "bash -c 'test -f {{widgetPath}} || test -f lib/widgets/$(basename {{widgetPath}})'"
    description: "Widget file exists at local path or has been lifted to lib/widgets/"
  - id: dart-valid
    cmd: "bash -c 'p={{widgetPath}}; if [ -f \"$p\" ]; then dart analyze \"$p\"; else dart analyze lib/widgets/$(basename \"$p\"); fi'"
    description: "Dart analysis passes on whichever location holds the widget"
---

# Split: {{widgetName}}

Extract the `{{widgetName}}` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `{{screenPath}}` using grep string: `{{grepString}}`
2. **Create file** — Write `{{widgetPath}}` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `{{widgetName}}()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class {{widgetName}} extends StatelessWidget {
  const {{widgetName}}({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
