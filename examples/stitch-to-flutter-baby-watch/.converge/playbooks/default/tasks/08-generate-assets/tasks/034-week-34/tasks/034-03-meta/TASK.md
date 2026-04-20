---
id: 034-03-meta
title: "Meta — baby-size: Week 34"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 034-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/034-week-34/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-34.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-34.svg.meta.json
vars:
  skill: metadata-generation
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `week-34.svg.meta.json` in the appropriate assets directory:

```json
{
  "id": "week-34",
  "version": "1.0.0",
  "created": "2026-04-20",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-34.svg",
  "semantic": {
    "title": "Week 34 Baby Size",
    "description": "...",
    "tags": [
      "baby-size",
      "pregnancy", "week-34", "cantaloupe"
      
      
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
    "light": "week-34.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/034-week-34/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
