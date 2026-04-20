---
id: 029-02-spec
title: "Spec — baby-size: Week 29"
description: Create detailed visual specification for the asset
dependencies:
  - 029-01-analyze
blocking: true
tags:
  - asset
  - spec
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/029-week-29/requirements.json
outputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/029-week-29/SPEC.md
checks:
  - id: spec-exists
    description: Visual specification document exists
    cmd: test -f .converge/playbooks/default/tasks/08-generate-assets/tasks/029-week-29/SPEC.md
vars:
  skill: visual-specification
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 029
  assetId: week-29
  fileName: week-29.svg
  weekNumber: 29
  comparison: butternut squash
  emoji: 🎃
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-29.svg
  assetTaskId: 029-week-29
  assetLabel: Week 29
  assetWidgetName: Week29
  assetDescription: Week 29 baby size illustration showing a butternut squash.
  contextBlock: "**Baby Size Illustration — Week 29**\n- Size comparison: \"butternut squash\" 🎃\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a butternut squash alongside a gestational sac/fetus at week 29.
  metaTitle: Week 29 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-29\", \"butternut squash\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized butternut squash (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek29Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
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
# Asset Specification: week-29

## Overview
Baby size comparison illustration showing a butternut squash alongside a gestational sac/fetus at week 29.

## Visual Description
[Detailed description for SVG generation]

## Color Palette
- Primary: #FF6B6B (coral)
- Secondary: #9B59B6 (lilac)
- Background: transparent

## Dimensions
- ViewBox: 0 0 200 200
- Padding: 10%

## Style Notes
- Line weight: 3px
- Rounded corners: 8px
- Flat design with subtle shadows

## Variants
- Light mode: as specified
- Dark mode: inverted colors
```

Be specific enough that an AI can generate the SVG from this description.
