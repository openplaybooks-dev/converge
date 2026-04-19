---
id: 060-04-generate
title: "Generate — empty-state: Offline"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - 060-03-meta
blocking: true
tags:
  - asset
  - generate
  - svg
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/060-empty-offline/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/illustrations/empty-states/offline.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/illustrations/empty-states/offline.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/illustrations/empty-states/offline.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/illustrations/empty-states/offline.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 060
  assetId: offline
  fileName: offline.svg
  stateName: Offline
  context: no internet connection
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/offline.svg
  assetTaskId: 060-empty-offline
  assetLabel: Offline
  assetWidgetName: Offline
  assetDescription: Offline empty state illustration.
  contextBlock: "**Empty State — Offline**\n- Context: no internet connection\n- Usage: Displayed when no internet connection\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"Offline\" — shown when no internet connection."
  metaTitle: Offline Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"offline\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"Offline\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines

### Empty State Illustration Specifics

Create a friendly illustration for "Offline":
1. Soft, encouraging mood
2. Character or scene that explains the state
3. Coral/lilac color palette
4. Generous whitespace
5. Suitable for 200x200 display

## Output

Create `assets/illustrations/empty-states/offline.svg`:

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
