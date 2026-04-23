---
id: 051-04-generate
title: "Generate — icon: Mood"
description: Generate the actual SVG icon file
dependencies:
  - 051-02-spec
blocking: true
tags:
  - asset
  - generate
  - svg
  - icon
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/051-icon-status-mood/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/icons/status-mood.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/icons/status-mood.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/icons/status-mood.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/icons/status-mood.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 051
  assetId: status-mood
  fileName: status-mood.svg
  iconName: Mood
  category: status
  assetType: icon
  outputPath: assets/icons/status-mood.svg
  assetTaskId: 051-icon-status-mood
  assetWidgetName: StatusMood
---

# Generate SVG Icon

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Icon Specifics

Create a 24x24 SVG icon for "Mood":
1. Outlined style (not filled)
2. 1.5px stroke width
3. Rounded stroke caps and joins
4. Simple, recognizable silhouette
5. No colors (use currentColor for stroke)

The icon should be instantly recognizable at 24x24px.

## Output

Create `assets/icons/status-mood.svg`:

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
