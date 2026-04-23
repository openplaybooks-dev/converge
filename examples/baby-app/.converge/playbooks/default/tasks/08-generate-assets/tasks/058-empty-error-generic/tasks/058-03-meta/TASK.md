---
id: 058-03-meta
title: "Meta — empty-state: Generic Error"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 058-02-spec
blocking: true
tags:
  - asset
  - meta
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/058-empty-error-generic/SPEC.md
outputs:
  - assets/illustrations/empty-states/error-generic.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/empty-states/error-generic.svg.meta.json
vars:
  skill: metadata-generation
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

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/empty-states/error-generic.svg.meta.json`:

```json
{
  "id": "error-generic",
  "version": "1.0.0",
  "type": "empty-state",
  "format": "svg",
  "fileName": "error-generic.svg",
  "semantic": {
    "title": "Generic Error Illustration",
    "description": "...",
    "tags": ["empty-state", "feedback", "error-generic"],
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
    "light": "error-generic.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/058-empty-error-generic/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
