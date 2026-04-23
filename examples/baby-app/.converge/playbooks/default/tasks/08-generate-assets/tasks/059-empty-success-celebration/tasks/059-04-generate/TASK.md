---
id: 059-04-generate
title: "Generate — empty-state: Success"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - 059-03-meta
blocking: true
tags:
  - asset
  - generate
  - svg
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/059-empty-success-celebration/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/illustrations/empty-states/success-celebration.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/illustrations/empty-states/success-celebration.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/illustrations/empty-states/success-celebration.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/illustrations/empty-states/success-celebration.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 059
  assetId: success-celebration
  fileName: success-celebration.svg
  stateName: Success
  context: achievement unlocked
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/success-celebration.svg
  assetTaskId: 059-empty-success-celebration
  assetLabel: Success
  assetWidgetName: SuccessCelebration
  assetDescription: Success empty state illustration.
  contextBlock: "**Empty State — Success**\n- Context: achievement unlocked\n- Usage: Displayed when achievement unlocked\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Success\" — shown when achievement unlocked."
  metaTitle: Success Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"success-celebration\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Success\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines

### Empty State Illustration Specifics

Create a friendly illustration for "Success":
1. Soft, encouraging mood
2. Character or scene that explains the state
3. Coral/lilac color palette
4. Generous whitespace
5. Suitable for 200x200 display

## Output

Create `assets/illustrations/empty-states/success-celebration.svg`:

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
