---
id: 056-03-meta
title: "Meta — empty-state: No Data"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 056-02-spec
blocking: true
tags:
  - asset
  - meta
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/SPEC.md
outputs:
  - assets/illustrations/empty-states/empty-data.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/empty-states/empty-data.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 056
  assetId: empty-data
  fileName: empty-data.svg
  stateName: No Data
  context: lists with no items
  assetType: empty-state
  outputPath: assets/illustrations/empty-states/empty-data.svg
  assetTaskId: 056-empty-empty-data
  assetLabel: No Data
  assetWidgetName: EmptyData
  assetDescription: No Data empty state illustration.
  contextBlock: "**Empty State — No Data**\n- Context: lists with no items\n- Usage: Displayed when lists with no items\n- Style: Friendly, soft colors, encouraging"
  specOverview: "Empty state illustration for \"No Data\" — shown when lists with no items."
  metaTitle: No Data Illustration
  metaTags: "[\"empty-state\", \"feedback\", \"empty-data\"]"
  generateGuidelines: "### Empty State Illustration Specifics\n\nCreate a friendly illustration for \"No Data\":\n1. Soft, encouraging mood\n2. Character or scene that explains the state\n3. Coral/lilac color palette\n4. Generous whitespace\n5. Suitable for 200x200 display"
  wireInstructions: 
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/empty-states/empty-data.svg.meta.json`:

```json
{
  "id": "empty-data",
  "version": "1.0.0",
  "type": "empty-state",
  "format": "svg",
  "fileName": "empty-data.svg",
  "semantic": {
    "title": "No Data Illustration",
    "description": "...",
    "tags": ["empty-state", "feedback", "empty-data"],
    "alt": "..."
  },
  "usage": {
    "screens": ["HomeScreen"],
    "widgets": ["HeroIllustrationCard"],
    "accessibility": {
      "label": "...",
      "role": "image"
    }
  },
  "variants": {
    "light": "empty-data.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/056-empty-empty-data/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
