---
id: 040-04-generate
title: "Generate — baby-size: Week 40"
description: Generate the actual SVG asset file using AI illustration generation
dependencies:
  - 040-03-meta
blocking: true
tags:
  - asset
  - generate
  - svg
  - baby-size
inputs:
  - .converge/playbooks/default/tasks/04-generate-assets/tasks/040-week-40/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - assets/illustrations/baby-sizes/week-40.svg
checks:
  - id: svg-exists
    description: SVG file was generated
    cmd: test -f assets/illustrations/baby-sizes/week-40.svg
  - id: svg-valid
    description: File contains valid SVG markup
    cmd: "head -5 assets/illustrations/baby-sizes/week-40.svg | grep -q '<svg'"
  - id: svg-size-reasonable
    description: "SVG file size is reasonable (not empty, not huge)"
    cmd: "stat -f%z assets/illustrations/baby-sizes/week-40.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
vars:
  skill: svg-illustration-generation
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

# Generate SVG Asset

Generate the actual SVG file based on the specification.

## Prerequisites

Read `SPEC.md` for detailed visual requirements.

## Generation Guidelines

### Baby Size Illustration Specifics

Create an SVG showing:
1. A cute, stylized small pumpkin (the fruit/vegetable)
2. A subtle gestational sac or baby silhouette
3. Soft, friendly illustration style
4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors
5. Clean vector lines suitable for scaling

Design system:
- Use rounded, organic shapes
- Subtle gradient fills (if any) should be simple 2-color
- Background: transparent
- Style: Modern flat illustration with soft shadows

## Output

Create `assets/illustrations/baby-sizes/week-40.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 200 200"
     fill="none">
  <!-- Generated content based on SPEC.md -->
</svg>
```

Requirements:
- Valid SVG 1.1 or 2.0
- No external dependencies
- Optimized for file size
- Accessible (title element if standalone)
