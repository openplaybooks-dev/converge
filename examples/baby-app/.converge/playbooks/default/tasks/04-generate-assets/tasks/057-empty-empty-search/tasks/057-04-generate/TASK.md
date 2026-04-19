---
id: 057-04-generate
title: "Generate — empty-state: No Search Results"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - 057-03-meta
blocking: true
tags:
  - asset
  - generate
  - svg
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/057-empty-empty-search/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/illustrations/empty-states/empty-search.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/illustrations/empty-states/empty-search.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/illustrations/empty-states/empty-search.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/illustrations/empty-states/empty-search.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 057
  assetId: empty-search
  fileName: empty-search.svg
  stateName: No Search Results
  context: search with no matches
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/empty-search.svg
  assetTaskId: 057-empty-empty-search
  assetLabel: No Search Results
  assetWidgetName: EmptySearch
  assetDescription: No Search Results empty state illustration.
  contextBlock: "**Empty State — No Search Results**\n- Context: search with no matches\n- Usage: Displayed when search with no matches\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"No Search Results\" — shown when search with no matches."
  metaTitle: No Search Results Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"empty-search\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"No Search Results\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines

### Empty State Illustration Specifics

Create a friendly illustration for "No Search Results":
1. Soft, encouraging mood
2. Character or scene that explains the state
3. Coral/lilac color palette
4. Generous whitespace
5. Suitable for 200x200 display

## Output

Create `assets/illustrations/empty-states/empty-search.svg`:

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
