---
id: "{{prefix}}-02-spec"
title: "Spec — {{assetType}}: {{#if weekNumber}}Week {{weekNumber}}{{else}}{{iconName}}{{stateName}}{{/if}}"
description: Create detailed visual specification for the asset
dependencies:
  - "{{prefix}}-01-analyze"
skill: visual-specification
blocking: true
tags:
  - asset
  - spec
  - "{{assetType}}"
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/{{assetTaskId}}/requirements.json
outputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/{{assetTaskId}}/SPEC.md
checks:
  - id: spec-exists
    cmd: test -f .converge/playbooks/default/tasks/04-generate-assets/tasks/{{assetTaskId}}/SPEC.md
    description: Visual specification document exists
---

# Create Visual Specification

Write a detailed visual specification for generating this asset.

## From Requirements

Read `requirements.json` from the previous step.

## Specification Tasks

1. **Composition** — Layout, positioning, framing
2. **Colors** — Specific hex values from design system
3. **Shapes** — Geometric forms, organic shapes
4. **Details** — Textures, patterns, highlights
5. **Style Guide** — Flat, 3D, line art, etc.

## Output

Create `SPEC.md` with these sections:

```markdown
# Asset Specification: {{assetId}}

## Overview
{{#if weekNumber}}
Baby size comparison illustration showing a {{comparison}} alongside 
a gestational sac/fetus at week {{weekNumber}}.
{{/if}}
{{#if iconName}}
{{category}} icon representing "{{iconName}}" for use in {{category}} contexts.
{{/if}}

## Visual Description
[Detailed description for SVG generation]

## Color Palette
- Primary: #FF6B6B (coral)
- Secondary: #9B59B6 (lilac)
- Background: transparent

## Dimensions
- ViewBox: 0 0 {{#if weekNumber}}200 200{{else}}24 24{{/if}}
- Padding: 10%

## Style Notes
- Line weight: {{#if weekNumber}}3px{{else}}1.5px{{/if}}
- Rounded corners: 8px
- Flat design with subtle shadows

## Variants
- Light mode: as specified
- Dark mode: inverted colors
```

Be specific enough that an AI can generate the SVG from this description.
