---
id: 040-03-meta
title: "Meta — baby-size: Week 40"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 040-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/040-week-40/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-40.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-40.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 040
  assetId: week-40
  fileName: week-40.svg
  weekNumber: 40
  comparison: small pumpkin
  emoji: 🎃
  trimester: 3
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-40.svg
  assetTaskId: 040-week-40
  assetLabel: Week 40
  assetWidgetName: Week40
  assetDescription: Week 40 baby size illustration showing a small pumpkin.
  contextBlock: "**Baby Size Illustration — Week 40**\n- Size comparison: \"small pumpkin\" 🎃\n- Trimester: 3\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a small pumpkin alongside a gestational sac/fetus at week 40.
  metaTitle: Week 40 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-40\", \"small pumpkin\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized small pumpkin (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek40Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-40.svg.meta.json`:

```json
{
  "id": "week-40",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-40.svg",
  "semantic": {
    "title": "Week 40 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-40", "small pumpkin"],
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
    "light": "week-40.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/040-week-40/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
