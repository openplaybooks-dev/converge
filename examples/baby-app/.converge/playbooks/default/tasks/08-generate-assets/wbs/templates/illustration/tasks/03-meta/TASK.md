---
id: "{{prefix}}-03-meta"
title: "Meta — {{assetType}}: {{assetLabel}}"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - "{{prefix}}-02-spec"
skill: metadata-generation
blocking: true
tags:
  - asset
  - meta
  - "{{assetType}}"
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/SPEC.md
outputs:
  - "{{outputPath}}.meta.json"
checks:
  - id: meta-exists
    cmd: test -f {{outputPath}}.meta.json
    description: Metadata JSON file exists
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `{{outputPath}}.meta.json`:

```json
{
  "id": "{{assetId}}",
  "version": "1.0.0",
  "type": "{{assetType}}",
  "format": "svg",
  "fileName": "{{fileName}}",
  "semantic": {
    "title": "{{metaTitle}}",
    "description": "...",
    "tags": {{metaTags}},
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
    "light": "{{fileName}}",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
