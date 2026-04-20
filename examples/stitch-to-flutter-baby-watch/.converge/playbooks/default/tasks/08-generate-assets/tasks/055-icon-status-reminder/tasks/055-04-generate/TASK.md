---
id: 055-04-generate
title: "Generate — icon: Reminder{{stateName}}"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - 055-03-meta
blocking: true
tags:
  - asset
  - generate
  - svg
  - icon
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/055-icon-status-reminder/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/icons/status-reminder.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/icons/status-reminder.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/icons/status-reminder.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/icons/status-reminder.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
---

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines




### Icon Specifics

Create a 24x24 SVG icon for "Reminder":
1. Outlined style (not filled)
2. 1.5px stroke width
3. Rounded stroke caps and joins
4. Simple, recognizable silhouette
5. No colors (use currentColor for stroke)

The icon should be instantly recognizable at 24x24px.




## Output

Create `assets/icons/status-reminder.svg`:

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
