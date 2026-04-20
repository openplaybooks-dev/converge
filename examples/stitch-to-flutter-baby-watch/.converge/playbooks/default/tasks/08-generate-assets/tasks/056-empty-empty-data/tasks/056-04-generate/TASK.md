---
id: 056-04-generate
title: "Generate — empty-state: {{iconName}}No Data"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - 056-03-meta
blocking: true
tags:
  - asset
  - generate
  - svg
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/illustrations/empty-states/empty-data.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/illustrations/empty-states/empty-data.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/illustrations/empty-states/empty-data.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/illustrations/empty-states/empty-data.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
---

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines






### Empty State Illustration Specifics

Create a friendly illustration for "No Data":
1. Soft, encouraging mood
2. Character or scene that explains the state
3. Coral/lilac color palette
4. Generous whitespace
5. Suitable for 200x200 display


## Output

Create `assets/illustrations/empty-states/empty-data.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 24 24"
     fill="none"
     >
  <!-- Generated content based on SPEC.md -->
</svg>
```

Requirements:
- Valid SVG 1.1 or 2.0
- No external dependencies
- Optimized for file size
- Accessible (title element if standalone)
