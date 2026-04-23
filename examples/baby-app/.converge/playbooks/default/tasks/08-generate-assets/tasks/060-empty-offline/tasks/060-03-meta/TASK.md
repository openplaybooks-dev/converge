---
id: 060-03-meta
title: "Meta — empty-state: Offline"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 060-02-spec
blocking: true
tags:
  - asset
  - meta
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/060-empty-offline/SPEC.md
outputs:
  - assets/illustrations/empty-states/offline.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/empty-states/offline.svg.meta.json
vars:
  skill: metadata-generation
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

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/empty-states/offline.svg.meta.json`:

```json
{
  "id": "offline",
  "version": "1.0.0",
  "type": "empty-state",
  "format": "svg",
  "fileName": "offline.svg",
  "semantic": {
    "title": "Offline Illustration",
    "description": "...",
    "tags": ["empty-state", "feedback", "offline"],
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
    "light": "offline.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/060-empty-offline/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
