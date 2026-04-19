---
id: 047-04-generate
title: "Generate — icon: Edit"
description: Generate the actual SVG icon file
dependencies:
  - 047-02-spec
blocking: true
tags:
  - asset
  - generate
  - svg
  - icon
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/047-icon-action-edit/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/icons/action-edit.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/icons/action-edit.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/icons/action-edit.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/icons/action-edit.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 047
  assetId: action-edit
  fileName: action-edit.svg
  iconName: Edit
  category: action
  assetType: icon
  outputPath: assets/icons/action-edit.svg
  assetTaskId: 047-icon-action-edit
  assetWidgetName: ActionEdit
---

# Generate SVG Icon

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Icon Specifics

Create a 24x24 SVG icon for "Edit":
1. Outlined style (not filled)
2. 1.5px stroke width
3. Rounded stroke caps and joins
4. Simple, recognizable silhouette
5. No colors (use currentColor for stroke)

The icon should be instantly recognizable at 24x24px.

## Output

Create `assets/icons/action-edit.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Generated content based on SPEC.md -->
</svg>
```

Requirements:
- Valid SVG 1.1 or 2.0
- No external dependencies
- Optimized for file size
- Accessible (title element if standalone)
