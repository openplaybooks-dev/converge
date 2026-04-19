---
id: 008-05-split
title: "Split: Mood & Wellness"
description: "Extract widgets from Mood & Wellness screen into local widgets/"
dependencies:
  - 008-04-analyze
tags:
  - split
  - screen-mood-wellness
inputs:
  - .stitch/designs/mood-wellness/widgets.jsonl
outputs:
  - "lib/screens/mood_wellness/widgets/**/*.dart"
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

# Split: Mood & Wellness

Extract each widget identified in `.stitch/designs/mood-wellness/widgets.jsonl` into its own file under `lib/screens/mood_wellness/widgets/`.

For each widget:
1. Create `lib/screens/mood_wellness/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
