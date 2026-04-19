---
id: 022-03-meta
title: "Meta — baby-size: Week 22"
description: Generate metadata file with semantic tags and usage info
dependencies:
  - 022-02-spec
blocking: true
tags:
  - asset
  - meta
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/022-week-22/SPEC.md
outputs:
  - assets/illustrations/baby-sizes/week-22.svg.meta.json
checks:
  - id: meta-exists
    description: Metadata JSON file exists
    cmd: test -f assets/illustrations/baby-sizes/week-22.svg.meta.json
vars:
  skill: metadata-generation
  projectDir: /Users/minh/Documents/converge/examples/baby-app
  prefix: 022
  assetId: week-22
  fileName: week-22.svg
  weekNumber: 22
  comparison: papaya
  emoji: 🥭
  trimester: 2
  assetType: baby-size
  outputPath: assets/illustrations/baby-sizes/week-22.svg
  assetTaskId: 022-week-22
  assetLabel: Week 22
  assetWidgetName: Week22
  assetDescription: Week 22 baby size illustration showing a papaya.
  contextBlock: "**Baby Size Illustration — Week 22**\n- Size comparison: \"papaya\" 🥭\n- Trimester: 2\n- Used in: HeroIllustrationCard on HomeScreen\n- Data source: WeekContent.sizeComparison field"
  specOverview: Baby size comparison illustration showing a papaya alongside a gestational sac/fetus at week 22.
  metaTitle: Week 22 Baby Size
  metaTags: "[\"baby-size\", \"pregnancy\", \"week-22\", \"papaya\"]"
  generateGuidelines: "### Baby Size Illustration Specifics\n\nCreate an SVG showing:\n1. A cute, stylized papaya (the fruit/vegetable)\n2. A subtle gestational sac or baby silhouette\n3. Soft, friendly illustration style\n4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors\n5. Clean vector lines suitable for scaling\n\nDesign system:\n- Use rounded, organic shapes\n- Subtle gradient fills (if any) should be simple 2-color\n- Background: transparent\n- Style: Modern flat illustration with soft shadows"
  wireInstructions: "## Update HeroIllustrationCard\n\nReplace the CustomPainter placeholder in `lib/screens/home/_widgets/hero_illustration_card.dart`:\n\n```dart\n// OLD:\nCustomPaint(\n  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),\n)\n\n// NEW:\nWeek22Asset(\n  width: 140,\n  height: 140,\n)\n```\n\nNote: The card should look up the appropriate asset based on `weekNumber`."
---

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-22.svg.meta.json`:

```json
{
  "id": "week-22",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-22.svg",
  "semantic": {
    "title": "Week 22 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-22", "papaya"],
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
    "light": "week-22.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/022-week-22/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management
