---
id: "{{prefix}}-03-meta"
title: "Meta — {{assetType}}: {{#if weekNumber}}Week {{weekNumber}}{{else}}{{iconName}}{{stateName}}{{/if}}"
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
  - assets/illustrations/baby-sizes/{{fileName}}.meta.json
{{#if iconName}}
  - assets/icons/{{fileName}}.meta.json
{{/if}}
{{#if stateName}}
  - assets/illustrations/empty-states/{{fileName}}.meta.json
{{/if}}
checks:
  - id: meta-exists
    cmd: "{{#if weekNumber}}test -f assets/illustrations/baby-sizes/{{fileName}}.meta.json{{/if}}{{#if iconName}}test -f assets/icons/{{fileName}}.meta.json{{/if}}{{#if stateName}}test -f assets/illustrations/empty-states/{{fileName}}.meta.json{{/if}}"
    description: Metadata JSON file exists
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `{{fileName}}.meta.json` in the appropriate assets directory:

```json
{
  "id": "{{assetId}}",
  "version": "1.0.0",
  "created": "{{currentDate}}",
  "type": "{{assetType}}",
  "format": "svg",
  "fileName": "{{fileName}}",
  "semantic": {
    "title": "{{#if weekNumber}}Week {{weekNumber}} Baby Size{{/if}}{{#if iconName}}{{iconName}} Icon{{/if}}{{#if stateName}}{{stateName}} Illustration{{/if}}",
    "description": "...",
    "tags": [
      "{{assetType}}",
      {{#if weekNumber}}"pregnancy", "week-{{weekNumber}}", "{{comparison}}"{{/if}}
      {{#if iconName}}"{{category}}", "ui"{{/if}}
      {{#if stateName}}"empty-state", "feedback"{{/if}}
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
