---
id: 008-06-lift
title: "Lift: Mood & Wellness"
description: "Lift shared widgets from Mood & Wellness to lib/widgets/"
dependencies:
  - 008-05-split
blocking: true
tags:
  - lift
  - screen-mood-wellness
inputs:
  - .stitch/designs/mood-wellness/widgets.jsonl
  - "lib/screens/mood_wellness/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 008
  screenId: mood-wellness
  title: "Mood & Wellness"
  widgetName: MoodWellness
  snakeName: mood_wellness
  route: /mood
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  widgetsJsonPath: .stitch/designs/mood-wellness/widgets.jsonl
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenTaskId: 008-mood-wellness
  specPath: .stitch/designs/mood-wellness/SPEC.md
  metaPath: .stitch/designs/mood-wellness/META.md
  designPath: .stitch/designs/mood-wellness/design.html
  prevScreenLastId: 007-06-lift
---

# Lift: Mood & Wellness

Examine each widget in `lib/screens/mood_wellness/widgets/` that was marked `shared: true` in `.stitch/designs/mood-wellness/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/mood_wellness/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
