---
id: 006-03-meta
title: "Meta — baby-size: Week 6"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 006-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/006-week-06/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-06.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-06.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 006
  assetId: week-06
  fileName: week-06.svg
  weekNumber: 6
  comparison: sweet pea
  emoji: 🫛
  trimester: 1
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-06.svg
  assetTaskId: 006-week-06
  assetLabel: Week 6
  assetWidgetName: Week06
  assetDescription: Week 6 baby size illustration showing a sweet pea.
  contextBlock: "**Baby Size Illustration — Week 6**\n- Size comparison: \"sweet pea\" 🫛\n- Trimester: 1\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a sweet pea alongside a gestational sac/fetus at week 6.
  metaTitle: Week 6 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-6\", \"sweet pea\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized sweet pea (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek06Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-06.svg.meta.json`:

```json
{
  "id": "week-06",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-06.svg",
  "semantic": {
    "title": "Week 6 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-6", "sweet pea"],
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
    "light": "week-06.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/006-week-06/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
