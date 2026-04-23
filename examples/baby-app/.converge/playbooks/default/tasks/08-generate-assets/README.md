# 04-Generate-Assets — Systematic Asset Generation

A comprehensive, systematic pipeline for generating all visual assets in the Bloom baby app.

## Overview

This task generates 60+ assets across multiple categories:
- **40 Baby Size Illustrations** — Weekly pregnancy progress (week 1-40)
- **15 Feature Icons** — Navigation, actions, status indicators
- **5 Empty State Illustrations** — No data, error, success states

Total: **~60 assets** generated through a 5-step pipeline each.

## Architecture

### 3-Level Deep Task Structure

```
08-generate-assets (WBS Parent)
├── 001-week-01 (Asset Parent)
│   ├── 001-01-analyze
│   ├── 001-02-spec
│   ├── 001-03-meta
│   ├── 001-04-generate
│   └── 001-05-wire
├── 002-week-02 (Asset Parent)
│   ├── 002-01-analyze
│   ├── 002-02-spec
│   ├── 002-03-meta
│   ├── 002-04-generate
│   └── 002-05-wire
├── ... (40 weeks)
├── 041-icon-nav-home (Asset Parent)
│   ├── 041-01-analyze
│   ├── 041-02-spec
│   ├── 041-04-generate  (skips meta for icons)
│   └── 041-05-wire
├── ... (15 icons)
└── 056-empty-data (Asset Parent)
    ├── 056-01-analyze
    ├── 056-02-spec
    ├── 056-03-meta
    ├── 056-04-generate
    └── 056-05-wire
```

### 5-Step Pipeline per Asset

| Step | Purpose | Output |
|------|---------|--------|
| **01-Analyze** | Requirements analysis | `requirements.json` |
| **02-Spec** | Visual specification | `SPEC.md` |
| **03-Meta** | Metadata & tags | `asset.svg.meta.json` |
| **04-Generate** | Create SVG file | `asset.svg` |
| **05-Wire** | Integrate to code | `asset_widget.dart` |

## Asset Categories

### 1. Baby Size Illustrations (40 weeks)

Location: `assets/illustrations/baby-sizes/`

Weekly baby size comparisons from poppy seed to small pumpkin.

| Week | Comparison | Trimester |
|------|------------|-----------|
| 1-4 | Poppy seed | 1 |
| 5-12 | Apple seed → Plum | 1 |
| 13-27 | Peach → Cauliflower | 2 |
| 28-40 | Eggplant → Pumpkin | 3 |

Each illustration shows:
- The fruit/vegetable comparison
- Subtle gestational reference
- Soft, friendly style
- Coral/lilac color palette

### 2. Feature Icons (15 icons)

Location: `assets/icons/`

**Navigation (5):**
- nav-home, nav-progress, nav-health, nav-wellness, nav-learn

**Actions (5):**
- action-add, action-edit, action-delete, action-share, action-bookmark

**Status (5):**
- status-mood, status-weight, status-cycle, status-symptom, status-reminder

Icon specs:
- 24x24 viewport
- Outlined style
- 1.5px stroke
- currentColor for theming

### 3. Empty State Illustrations (5 states)

Location: `assets/illustrations/empty-states/`

- empty-data — No items in list
- empty-search — No search results
- error-generic — Something went wrong
- success-celebration — Achievement unlocked
- offline — No internet connection

## Running the Task

### Full Asset Generation

```bash
converge run 08-generate-assets
```

This will:
1. Spawn all 60 asset tasks
2. Execute 5-step pipeline per asset
3. Generate SVG files
4. Create widget wrappers
5. Wire into existing screens

### Generate Specific Category

```bash
# Baby sizes only (40 weeks)
converge run 08-generate-assets --filter baby-size

# Icons only (15 icons)
converge run 08-generate-assets --filter icon

# Empty states only (5 states)
converge run 08-generate-assets --filter empty-state
```

### Single Asset Step

```bash
# Analyze week 5
converge run --step 001-01-analyze

# Generate week 5
converge run --step 001-04-generate
```

## Output Structure

```
assets/
├── assets.json              # Asset manifest
├── icons/                   # 15 SVG icons
│   ├── nav-home.svg
│   ├── nav-home.svg.meta.json
│   └── ...
├── images/                  # Photos (if any)
└── illustrations/
    ├── baby-sizes/          # 40 SVG illustrations
    │   ├── week-01.svg
    │   ├── week-01.svg.meta.json
    │   └── ...
    ├── empty-states/        # 5 SVG illustrations
    │   └── ...
    └── exercises/           # Future: exercise illustrations

lib/
├── widgets/
│   └── assets/
│       ├── asset_widget.dart    # Base classes
│       ├── week_01_asset.dart   # Generated
│       ├── week_02_asset.dart   # Generated
│       └── ...
└── gen/
    └── assets.gen.dart      # Future: generated asset paths
```

## Using Assets in Code

### Baby Size Illustrations

```dart
import 'package:flutter/material.dart';
import '../../widgets/assets/week_22_asset.dart';

class HeroIllustrationCard extends StatelessWidget {
  final int weekNumber;
  
  @override
  Widget build(BuildContext context) {
    // Dynamically load appropriate week asset
    return WeekAssetFactory.build(weekNumber);
  }
}
```

### Icons

```dart
import '../../widgets/assets/icon_nav_home.dart';

IconButton(
  icon: IconNavHomeAsset(
    color: Theme.of(context).colorScheme.primary,
  ),
  onPressed: () => context.go('/home'),
)
```

### Direct SVG Access

```dart
import 'package:flutter_svg/flutter_svg.dart';

SvgPicture.asset(
  'assets/icons/nav-home.svg',
  width: 24,
  height: 24,
  colorFilter: ColorFilter.mode(
    Theme.of(context).iconTheme.color!,
    BlendMode.srcIn,
  ),
)
```

## Design System Compliance

All assets follow the Bloom Design System:

**Colors:**
- Primary: `#FF6B6B` (Coral)
- Secondary: `#9B59B6` (Lilac)
- Accent: `#4ECDC4` (Teal)
- Background: Transparent

**Style:**
- Flat design with soft shadows
- Rounded corners (8px radius)
- Organic, friendly shapes
- Consistent line weights

**Accessibility:**
- Semantic labels
- Screen reader support
- High contrast variants

## Extending the System

### Adding New Asset Categories

Edit `wbs/index.js` and add a new spawn function:

```javascript
async function spawnExerciseIllustrations(ctx, startIdx, templateBase, vars) {
  const exercises = [
    { id: 'breathing-basic', name: 'Basic Breathing' },
    { id: 'stretching-prenatal', name: 'Prenatal Stretching' },
    // ...
  ];
  // Spawn tasks similar to other categories
}
```

### Customizing Templates

Edit files in `wbs/templates/asset/tasks/`:
- `01-analyze/TASK.md` — Requirements analysis
- `02-spec/TASK.md` — Visual specification
- `03-meta/TASK.md` — Metadata generation
- `04-generate/TASK.md` — SVG creation
- `05-wire/TASK.md` — Code integration

## Checks & Validation

Each step has validation checks:

1. **Analyze** — `requirements.json` exists and valid
2. **Spec** — `SPEC.md` exists with complete description
3. **Meta** — Metadata JSON exists with tags
4. **Generate** — SVG file exists, valid markup, reasonable size
5. **Wire** — Widget created, asset referenced in code

Parent task checks:
- All asset directories created
- At least 5 SVGs generated
- Asset class generated
- Flutter project validates

## Troubleshooting

### WBS Spawns 0 Tasks

Check that `.stitch/screens.json` exists (required for context).

### SVG Generation Fails

- Check SPEC.md is complete
- Verify DESIGN.md exists for color reference
- Ensure output directories exist

### Code Integration Issues

- Verify flutter_svg is in pubspec.yaml
- Run `flutter pub get`
- Check import paths match project structure

## Future Enhancements

1. **Dark Mode Variants** — Generate inverted color versions
2. **Animation** — Lottie animations for exercises
3. **Responsive** — Multiple sizes per asset
4. **CDN** — Cloud storage for large assets
5. **Optimization** — SVGO minification step
