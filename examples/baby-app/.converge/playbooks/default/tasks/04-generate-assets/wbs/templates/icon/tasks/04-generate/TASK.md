---
id: "{{prefix}}-04-generate"
title: "Generate — icon: {{iconName}}"
description: Generate the actual SVG icon file
dependencies:
  - "{{prefix}}-02-spec"
skill: svg-illustration-generation
blocking: true
tags:
  - asset
  - generate
  - svg
  - icon
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/{{assetTaskId}}/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - "{{outputPath}}"
checks:
  - id: svg-exists
    cmd: test -f {{outputPath}}
    description: SVG file was generated
  - id: svg-valid
    cmd: head -5 {{outputPath}} | grep -q '<svg'
    description: File contains valid SVG markup
  - id: svg-size-reasonable
    cmd: "stat -f%z {{outputPath}} 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
    description: SVG file size is reasonable (not empty, not huge)
---

# Generate SVG Icon

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Icon Specifics

Create a 24x24 SVG icon for "{{iconName}}":
1. Outlined style (not filled)
2. 1.5px stroke width
3. Rounded stroke caps and joins
4. Simple, recognizable silhouette
5. No colors (use currentColor for stroke)

The icon should be instantly recognizable at 24x24px.

## Output

Create `{{outputPath}}`:

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
