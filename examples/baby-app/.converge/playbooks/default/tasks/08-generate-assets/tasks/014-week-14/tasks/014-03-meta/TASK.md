---
id: 014-03-meta
title: "Meta — baby-size: Week 14"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 014-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/014-week-14/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-14.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-14.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 014
  assetId: week-14
  fileName: week-14.svg
  weekNumber: 14
  comparison: lemon
  emoji: 🍋
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-14.svg
  assetTaskId: 014-week-14
  assetLabel: Week 14
  assetWidgetName: Week14
  assetDescription: Week 14 baby size illustration showing a lemon.
  contextBlock: "**Baby Size Illustration — Week 14**\n- Size comparison: \"lemon\" 🍋\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a lemon alongside a gestational sac/fetus at week 14.
  metaTitle: Week 14 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-14\", \"lemon\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized lemon (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek14Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-14.svg.meta.json`:

```json
{
  "id": "week-14",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-14.svg",
  "semantic": {
    "title": "Week 14 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-14", "lemon"],
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
    "light": "week-14.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/014-week-14/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
