---
id: "{{prefix}}-04-generate"
title: "Generate — {{assetType}}: {{assetLabel}}"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - "{{prefix}}-03-meta"
skill: svg-illustration-generation
blocking: true
tags:
  - asset
  - generate
  - svg
  - "{{assetType}}"
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/SPEC.md
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

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines

{{generateGuidelines}}

## Output

Create `{{outputPath}}`:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 200 200"
     fill="none">
  <!-- Generated content based on SPEC.md -->
</svg>
```

Requirements:
- Valid SVG 1.1 or 2.0
- No external dependencies
- Optimized for file size
- Accessible (title element if standalone)
