---
id: 060-03-meta
title: "Meta — empty-state: {{iconName}}Offline"
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
  - assets/illustrations/baby-sizes/offline.svg.meta.json
  - assets/illustrations/empty-states/offline.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/empty-states/offline.svg.meta.json
vars:
  skill: metadata-generation
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `offline.svg.meta.json` in the appropriate assets directory:

```json
{
  "id": "offline",
  "version": "1.0.0",
  "created": "2026-04-20",
  "type": "empty-state",
  "format": "svg",
  "fileName": "offline.svg",
  "semantic": {
    "title": "Offline Illustration",
    "description": "...",
    "tags": [
      "empty-state",
      
      
      "empty-state", "feedback"
    ],
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
