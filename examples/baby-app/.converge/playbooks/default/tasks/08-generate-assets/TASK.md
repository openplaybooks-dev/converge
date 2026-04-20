---
id: 08-generate-assets
title: Generate Assets — Icons, Illustrations & Images
description: Systematic asset generation pipeline — analyze needs, create specs, generate metadata, create SVGs, wire to code — for all visual assets
references:
  - flutter-asset-management
  - svg-illustration-guidelines
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
dependencies:
  - 02-design-system
tags:
  - assets
  - svg
  - illustrations
  - icons
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - lib/models/*.dart
outputs:
  - assets/icons/**/*.svg
  - assets/images/**/*.svg
  - assets/illustrations/**/*.svg
  - lib/gen/assets.gen.dart
  - pubspec.yaml (asset references updated)
checks:
  - id: assets-directory-exists
    cmd: test -d assets/ && test -d assets/icons && test -d assets/images && test -d assets/illustrations
    description: Asset directories created
  - id: svgs-generated
    cmd: find assets -name '*.svg' -type f | wc -l | awk '{if ($1 >= 5) exit 0; exit 1}'
    description: At least 5 SVG assets generated
  - id: asset-class-generated
    cmd: test -f lib/gen/assets.gen.dart
    description: Asset class generated
  - id: flutter-validate
    cmd: flutter pub get && dart analyze lib/
    description: Flutter project validates with new assets
backlogs:
  - id: missing-assets
    cmd: "grep -rn -E 'AssetImage|Image.asset' lib/ --include='*.dart' 2>/dev/null | grep -v 'assets/' || true"
    description: Hardcoded asset references not using generated class
    severity: medium
---

# Generate Assets — Icons, Illustrations & Images

This epic generates all visual assets for the app through a systematic 5-step pipeline per asset category:

1. **Analyze** — Scan screens, models, and design docs to identify needed assets
2. **Spec** — Create detailed asset specifications (type, dimensions, style, content)
3. **Meta** — Generate metadata files with semantic naming and tags
4. **Generate** — Create SVG assets using AI illustration generation
5. **Wire** — Update code to use generated assets via AssetGen class

## Asset Categories

### 1. Baby Size Illustrations (40 weeks)
Weekly baby size comparison illustrations matching the `sizeComparison` field in WeekContent model.
Examples: poppy seed, blueberry, raspberry, lime, avocado, mango, pineapple, watermelon, etc.

### 2. App Icons
- Launcher icons (iOS/Android)
- Notification icons
- Adaptive icons

### 3. Feature Icons (SVG)
- Navigation icons (home, progress, health, wellness, learn)
- Action icons (add, edit, delete, share, bookmark)
- Status icons (mood, weight, cycle, symptoms)

### 4. Exercise Illustrations
- Breathing exercise poses
- Stretching illustrations
- Mindfulness activity visuals

### 5. Empty State Illustrations
- No data states
- Error states
- Success/celebration states

### 6. Article Hero Images
- Featured article header images
- Topic category images

## Output Structure

```
assets/
├── icons/           # 24x24, outlined, stroke-based SVGs
├── images/          # Photos, complex illustrations (PNG/WebP fallback)
└── illustrations/   # Weekly baby sizes, exercise poses (SVG)
    └── baby-sizes/  # week-01.svg through week-40.svg
```

## Dependencies

- flutter_svg: ^2.0.9
- flutter_gen_runner: (for asset class generation)
