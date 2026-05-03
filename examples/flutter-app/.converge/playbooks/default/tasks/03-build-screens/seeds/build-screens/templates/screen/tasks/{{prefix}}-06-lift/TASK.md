---
id: "{{prefix}}-06-lift"
title: "Lift: {{title}}"
description: "Lift shared widgets from {{title}} to lib/widgets/"
seeds:
  - type: nodejs
    path: ./seed.js
blocking: true
dependencies:
  - "{{prefix}}-05-split"
tags:
  - lift
  - screen-{{screenId}}
inputs:
  - "{{widgetsJsonPath}}"
  - "{{localWidgetsDir}}/**/*.dart"
outputs:
  - lib/widgets/**/*.dart
---

# Lift: {{title}}

Examine each widget in `{{localWidgetsDir}}/` that was marked `shared: true` in `{{widgetsJsonPath}}`.

For each shared widget:
1. Move from `{{localWidgetsDir}}/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
