---
id: 036-03-meta
title: "Meta — baby-size: Week 36"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 036-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/036-week-36/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-36.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-36.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 036
  assetId: week-36
  fileName: week-36.svg
  weekNumber: 36
  comparison: romaine lettuce
  emoji: 🥬
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-36.svg
  assetTaskId: 036-week-36
  assetLabel: Week 36
  assetWidgetName: Week36
  assetDescription: Week 36 baby size illustration showing a romaine lettuce.
  contextBlock: "**Baby Size Illustration — Week 36**\n- Size comparison: \"romaine lettuce\" 🥬\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a romaine lettuce alongside a gestational sac/fetus at week 36.
  metaTitle: Week 36 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-36\", \"romaine lettuce\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized romaine lettuce (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek36Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-36.svg.meta.json`:

```json
{
  "id": "week-36",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-36.svg",
  "semantic": {
    "title": "Week 36 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-36", "romaine lettuce"],
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
    "light": "week-36.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/036-week-36/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
