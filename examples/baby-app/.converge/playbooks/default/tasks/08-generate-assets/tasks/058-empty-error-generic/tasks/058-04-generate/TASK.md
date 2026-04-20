---
id: 058-04-generate
title: "Generate — empty-state: Generic Error"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - 058-03-meta
blocking: true
tags:
  - asset
  - generate
  - svg
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/058-empty-error-generic/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/illustrations/empty-states/error-generic.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/illustrations/empty-states/error-generic.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/illustrations/empty-states/error-generic.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/illustrations/empty-states/error-generic.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 058
  assetId: error-generic
  fileName: error-generic.svg
  stateName: Generic Error
  context: something went wrong
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/error-generic.svg
  assetTaskId: 058-empty-error-generic
  assetLabel: Generic Error
  assetWidgetName: ErrorGeneric
  assetDescription: Generic Error empty state illustration.
  contextBlock: "**Empty State — Generic Error**\n- Context: something went wrong\n- Usage: Displayed when something went wrong\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Generic Error\" — shown when something went wrong."
  metaTitle: Generic Error Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"error-generic\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Generic Error\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines

### Empty State Illustration Specifics

Create a friendly illustration for "Generic Error":
1. Soft, encouraging mood
2. Character or scene that explains the state
3. Coral/lilac color palette
4. Generous whitespace
5. Suitable for 200x200 display

## Output

Create `assets/illustrations/empty-states/error-generic.svg`:

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
