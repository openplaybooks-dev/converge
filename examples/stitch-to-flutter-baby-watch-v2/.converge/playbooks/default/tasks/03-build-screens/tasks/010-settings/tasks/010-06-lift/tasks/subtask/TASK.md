---
id: "{{subtaskId}}"
title: "Lift: {{widgetName}}"
description: "Move {{widgetName}} from local widgets to lib/widgets/"
tags:
  - lift
  - widget
inputs:
  - "{{localWidgetPath}}"
outputs:
  - "{{sharedWidgetPath}}"
checks:
  - id: widget-exists
    cmd: "test -f {{sharedWidgetPath}}"
    description: "Shared widget file exists"
  - id: dart-valid
    cmd: "dart analyze {{sharedWidgetPath}}"
    description: "Dart analysis passes"
---

# Lift: {{widgetName}}

Move `{{widgetName}}` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `{{localWidgetPath}}` → `{{sharedWidgetPath}}`
2. **Update package import** — Change relative import to package import: `package:baby_watch/widgets/{{snakeName}}.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
