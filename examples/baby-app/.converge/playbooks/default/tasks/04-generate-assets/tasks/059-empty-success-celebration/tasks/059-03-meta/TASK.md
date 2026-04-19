---
id: 059-03-meta
title: "Meta — empty-state: Success"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 059-02-spec
blocking: true
tags:
  - asset
  - meta
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/059-empty-success-celebration/SPEC.md
outputs:
  - assets/illustrations/empty-states/success-celebration.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/empty-states/success-celebration.svg.meta.json
vars:
  skill: metadata-generation
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

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/empty-states/success-celebration.svg.meta.json`:

```json
{
  "id": "success-celebration",
  "version": "1.0.0",
  "type": "empty-state",
  "format": "svg",
  "fileName": "success-celebration.svg",
  "semantic": {
    "title": "Success Illustration",
    "description": "...",
    "tags": ["empty-state", "feedback", "success-celebration"],
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
    "light": "success-celebration.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/059-empty-success-celebration/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
