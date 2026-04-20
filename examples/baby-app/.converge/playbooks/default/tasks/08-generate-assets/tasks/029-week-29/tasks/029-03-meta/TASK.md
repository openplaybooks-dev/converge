---
id: 029-03-meta
title: "Meta — baby-size: Week 29"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 029-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/08-generate-assets/tasks/029-week-29/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-29.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-29.svg.meta.json
vars:
  skill: metadata-generation
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

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-29.svg.meta.json`:

```json
{
  "id": "week-29",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-29.svg",
  "semantic": {
    "title": "Week 29 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-29", "butternut squash"],
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
    "light": "week-29.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/08-generate-assets/tasks/029-week-29/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
