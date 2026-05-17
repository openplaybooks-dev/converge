---
title: "Split: {{widgetName}}"
description: "Extract {{widgetName}} widget from {{screenTitle}} screen"
tags:
  - split
  - widget
vars:
  widgetName:
  grepString:
  widgetPath:
  screenPath:
  screenId:
  screenTitle:
  subtaskId:
inputs:
  - "{{screenPath}}"
outputs:
  - "{{widgetPath}}"
checks:
  - id: widget-exists
    cmd: "test -f {{widgetPath}}"
    description: "Widget file exists"
  - id: dart-valid
    cmd: "dart analyze {{widgetPath}}"
    description: "Dart analysis passes"
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
