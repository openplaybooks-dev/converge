---
id: 019-03-meta
title: "Meta — baby-size: Week 19"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 019-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/019-week-19/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-19.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-19.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 019
  assetId: week-19
  fileName: week-19.svg
  weekNumber: 19
  comparison: tomato
  emoji: 🍅
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-19.svg
  assetTaskId: 019-week-19
  assetLabel: Week 19
  assetWidgetName: Week19
  assetDescription: Week 19 baby size illustration showing a tomato.
  contextBlock: "**Baby Size Illustration — Week 19**\n- Size comparison: \"tomato\" 🍅\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a tomato alongside a gestational sac/fetus at week 19.
  metaTitle: Week 19 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-19\", \"tomato\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized tomato (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek19Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-19.svg.meta.json`:

```json
{
  "id": "week-19",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-19.svg",
  "semantic": {
    "title": "Week 19 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-19", "tomato"],
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
    "light": "week-19.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/019-week-19/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
