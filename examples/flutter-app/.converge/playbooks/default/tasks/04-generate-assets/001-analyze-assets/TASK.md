---
id: 001-analyze-assets
title: "Analyze Assets — Build Asset Manifest"
description: Scan screens, models, providers, and design docs to discover all needed assets and produce assets.json
blocking: true
tags:
  - assets
  - analysis
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - lib/screens/**/*.dart
  - lib/models/*.dart
  - lib/data/*.dart
  - lib/providers/*.dart
outputs:
  - assets.json
checks:
  - id: manifest-exists
    cmd: test -f assets.json
    description: assets.json was created
  - id: manifest-has-assets
    cmd: "node -e \"const a=JSON.parse(require('fs').readFileSync('assets.json','utf-8')); process.exit(a.assets && a.assets.length >= 1 ? 0 : 1)\""
    description: Manifest contains at least 1 asset
  - id: every-asset-has-id
    cmd: "node -e \"const a=JSON.parse(require('fs').readFileSync('assets.json','utf-8')); const ok=a.assets.every(x=>x.id && x.type && x.outputPath); process.exit(ok ? 0 : 1)\""
    description: Every asset has id, type, and outputPath
---

# Analyze Assets — Build Asset Manifest

Scan the entire app to discover what visual assets are needed, then produce `assets.json`.

## What to Scan

### 1. Screen code (`lib/screens/**/*.dart`)

Look for:
- `Placeholder()` widgets — these are stand-ins for missing illustrations or images
- `CustomPaint` / `CustomPainter` — hand-drawn placeholders that should become real assets
- `Image.asset('...')` referencing files that don't exist yet under `assets/`
- `Icon(Icons.xxx)` where a custom icon would better match the design system
- `SvgPicture.asset('...')` referencing files that don't exist yet
- Comments like `// TODO: replace with asset`, `// placeholder`

### 2. Models and data (`lib/models/*.dart`, `lib/data/*.dart`)

Look for:
- Fields named `iconPath`, `imagePath`, `assetPath`, `illustration`, `icon`
- Enums or lists that imply a series of assets (e.g., a list of categories each needing an icon)
- String constants referencing asset paths

### 3. Design docs (`.stitch/system/DESIGN.md`, `.stitch/UX.md`)

Look for:
- Mentioned asset categories (icons, illustrations, hero images, etc.)
- Style guidelines for visual assets
- Specific assets described in the UX spec

### 4. Screen metadata (`.stitch/screens.json`)

Look for:
- Screen names that need navigation icons
- Screen descriptions mentioning visuals, illustrations, or images
- Screens with `navType: "bottom"` that need tab bar icons

### 5. Providers (`lib/providers/*.dart`)

Look for:
- Data structures that map to visual assets (e.g., category → icon)
- Mock data containing asset path references

## Output

Write `assets.json` with this structure:

```json
{
  "generatedAt": "2026-04-19T...",
  "assets": [
    {
      "id": "nav-home",
      "type": "icon",
      "name": "Home Navigation",
      "category": "navigation",
      "outputPath": "assets/icons/nav-home.svg",
      "format": "svg",
      "dimensions": { "width": 24, "height": 24 },
      "description": "Home tab icon for bottom navigation bar",
      "generateGuidelines": "Outlined home icon, 24x24, 1.5px stroke, single color. House shape with chimney. Use currentColor for theming. Clean geometric lines matching the app's rounded design language.",
      "context": {
        "screens": ["home"],
        "widget": "NavigationBar"
      },
      "wire": {
        "targetFile": "lib/screens/home/home_screen.dart",
        "action": "Replace Icons.home with SvgPicture.asset('assets/icons/nav-home.svg', width: 24, height: 24)",
        "widgetName": "NavHomeIcon"
      },
      "tags": ["icon", "navigation"]
    }
  ]
}
```

### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique kebab-case identifier |
| `type` | Yes | One of: `icon`, `illustration`, `image` |
| `name` | Yes | Human-readable name |
| `category` | Yes | Grouping (e.g., `navigation`, `empty-state`, `hero`, `feature`) |
| `outputPath` | Yes | Where to write the generated file, relative to project root |
| `format` | Yes | File format: `svg` or `png` |
| `dimensions` | Yes | `{ width, height }` in pixels |
| `description` | Yes | What this asset depicts — one sentence |
| `generateGuidelines` | Yes | Full instructions for generating this asset. Include style, colors, composition, and any design system references. This is the primary input for the generation step. |
| `context.screens` | Yes | Which screens use this asset |
| `context.widget` | Yes | Which widget displays this asset |
| `wire.targetFile` | Yes | Dart file to modify when wiring |
| `wire.action` | Yes | What code change to make — be specific (e.g., "Replace Placeholder() with SvgPicture.asset(...)") |
| `wire.widgetName` | Yes | PascalCase widget name for the asset wrapper |
| `tags` | Yes | Array of searchable tags |

## Rules

- Include ALL discovered assets, not just some
- The `generateGuidelines` field must contain enough detail for an AI to generate the asset without any other context — include colors (hex values), dimensions, style (outlined/filled/flat), composition notes
- Read DESIGN.md to extract the actual color palette, corner radius, and style — use those values in `generateGuidelines`
- The `wire.action` field must describe a concrete code change, not a vague instruction
- Use consistent `outputPath` conventions: `assets/icons/` for icons, `assets/illustrations/` for illustrations, `assets/images/` for raster images
- Every `id` must be unique across all assets
