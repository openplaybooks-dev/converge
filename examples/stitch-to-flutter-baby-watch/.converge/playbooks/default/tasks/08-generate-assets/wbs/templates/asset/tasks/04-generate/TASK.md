---
id: "{{prefix}}-04-generate"
title: "Generate — {{assetType}}: {{#if weekNumber}}Week {{weekNumber}}{{else}}{{iconName}}{{stateName}}{{/if}}"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - "{{prefix}}-03-meta"
skill: svg-illustration-generation
blocking: true
tags:
  - asset
  - generate
  - svg
  - "{{assetType}}"
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/{{assetTaskId}}/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - {{outputPath}}
checks:
  - id: svg-exists
    cmd: test -f {{outputPath}}
    description: SVG file was generated
  - id: svg-valid
    cmd: "{{#if weekNumber}}head -5 {{outputPath}} | grep -q '<svg'{{/if}}{{#if iconName}}head -5 {{outputPath}} | grep -q '<svg'{{/if}}{{#if stateName}}head -5 {{outputPath}} | grep -q '<svg'{{/if}}"
    description: File contains valid SVG markup
  - id: svg-size-reasonable
    cmd: "stat -f%z {{outputPath}} 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
    description: SVG file size is reasonable (not empty, not huge)
---

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines

{{#if weekNumber}}
### Baby Size Illustration Specifics

Create an SVG showing:
1. A cute, stylized {{comparison}} (the fruit/vegetable)
2. A subtle gestational sac or baby silhouette
3. Soft, friendly illustration style
4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors
5. Clean vector lines suitable for scaling

Design system:
- Use rounded, organic shapes
- Subtle gradient fills (if any) should be simple 2-color
- Background: transparent
- Style: Modern flat illustration with soft shadows
{{/if}}

{{#if iconName}}
### Icon Specifics

Create a 24x24 SVG icon for "{{iconName}}":
1. Outlined style (not filled)
2. 1.5px stroke width
3. Rounded stroke caps and joins
4. Simple, recognizable silhouette
5. No colors (use currentColor for stroke)

The icon should be instantly recognizable at 24x24px.
{{/if}}

{{#if stateName}}
### Empty State Illustration Specifics

Create a friendly illustration for "{{stateName}}":
1. Soft, encouraging mood
2. Character or scene that explains the state
3. Coral/lilac color palette
4. Generous whitespace
5. Suitable for 200x200 display
{{/if}}

## Output

Create `{{outputPath}}`:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {{#if weekNumber}}200 200{{else}}24 24{{/if}}"
     fill="none"
     {{#if iconName}}stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"{{/if}}>
  <!-- Generated content based on SPEC.md -->
</svg>
```

Requirements:
- Valid SVG 1.1 or 2.0
- No external dependencies
- Optimized for file size
- Accessible (title element if standalone)
