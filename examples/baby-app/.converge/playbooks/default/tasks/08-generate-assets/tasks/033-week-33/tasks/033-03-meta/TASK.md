---
id: 033-03-meta
title: "Meta — baby-size: Week 33"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 033-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/033-week-33/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-33.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-33.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 033
  assetId: week-33
  fileName: week-33.svg
  weekNumber: 33
  comparison: pineapple
  emoji: 🍍
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-33.svg
  assetTaskId: 033-week-33
  assetLabel: Week 33
  assetWidgetName: Week33
  assetDescription: Week 33 baby size illustration showing a pineapple.
  contextBlock: "**Baby Size Illustration — Week 33**\n- Size comparison: \"pineapple\" 🍍\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a pineapple alongside a gestational sac/fetus at week 33.
  metaTitle: Week 33 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-33\", \"pineapple\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized pineapple (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek33Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-33.svg.meta.json`:

```json
{
  "id": "week-33",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-33.svg",
  "semantic": {
    "title": "Week 33 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-33", "pineapple"],
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
    "light": "week-33.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/033-week-33/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
