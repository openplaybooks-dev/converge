---
id: 058-03-meta
title: "Meta — empty-state: {{iconName}}Generic Error"
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
  - assets/illustrations/baby-sizes/error-generic.svg.meta.json
  - assets/illustrations/empty-states/error-generic.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/empty-states/error-generic.svg.meta.json
vars:
  skill: metadata-generation
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `error-generic.svg.meta.json` in the appropriate assets directory:

```json
{
  "id": "error-generic",
  "version": "1.0.0",
  "created": "2026-04-20",
  "type": "empty-state",
  "format": "svg",
  "fileName": "error-generic.svg",
  "semantic": {
    "title": "Generic Error Illustration",
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
