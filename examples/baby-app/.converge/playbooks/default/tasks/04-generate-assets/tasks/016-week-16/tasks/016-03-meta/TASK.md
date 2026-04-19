---
id: 016-03-meta
title: "Meta — baby-size: Week 16"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 016-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/016-week-16/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-16.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-16.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 016
  assetId: week-16
  fileName: week-16.svg
  weekNumber: 16
  comparison: avocado
  emoji: 🥑
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-16.svg
  assetTaskId: 016-week-16
  assetLabel: Week 16
  assetWidgetName: Week16
  assetDescription: Week 16 baby size illustration showing a avocado.
  contextBlock: "**Baby Size Illustration — Week 16**\n- Size comparison: \"avocado\" 🥑\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a avocado alongside a gestational sac/fetus at week 16.
  metaTitle: Week 16 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-16\", \"avocado\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized avocado (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek16Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-16.svg.meta.json`:

```json
{
  "id": "week-16",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-16.svg",
  "semantic": {
    "title": "Week 16 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-16", "avocado"],
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
    "light": "week-16.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/016-week-16/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
