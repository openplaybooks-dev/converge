---
id: "{{prefix}}-05-split"
title: "Split: {{title}}"
description: "Extract widgets from {{title}} screen into local widgets/"
seeds:
  - type: nodejs
    path: ./seed.js
depends_on:
  - "{{prefix}}-04-analyze"
tags:
  - split
  - screen-{{screenId}}
inputs:
  - "{{widgetsJsonPath}}"
outputs:
  - "{{localWidgetsDir}}/**/*.dart"
---

# Split: {{title}}

Extract each widget identified in `{{widgetsJsonPath}}` into its own file under `{{localWidgetsDir}}/`.

For each widget:
1. Create `{{localWidgetsDir}}/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
