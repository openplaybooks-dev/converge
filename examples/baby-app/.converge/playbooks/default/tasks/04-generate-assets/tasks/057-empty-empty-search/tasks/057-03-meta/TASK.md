---
id: 057-03-meta
title: "Meta — empty-state: No Search Results"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 057-02-spec
blocking: true
tags:
  - asset
  - meta
  - empty-state
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/057-empty-empty-search/SPEC.md
outputs:
  - assets/illustrations/empty-states/empty-search.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/empty-states/empty-search.svg.meta.json
vars:
  skill: metadata-generation
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

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/empty-states/empty-search.svg.meta.json`:

```json
{
  "id": "empty-search",
  "version": "1.0.0",
  "type": "empty-state",
  "format": "svg",
  "fileName": "empty-search.svg",
  "semantic": {
    "title": "No Search Results Illustration",
    "description": "...",
    "tags": ["empty-state", "feedback", "empty-search"],
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
    "light": "empty-search.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/057-empty-empty-search/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
