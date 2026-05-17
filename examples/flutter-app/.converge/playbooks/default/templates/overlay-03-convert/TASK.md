---
title: "Convert: {{title}}"
description: "Convert constrained HTML design to Flutter widget for {{title}} overlay"
skill: stitch-flutter
references:
  - flutter-building-layouts
tags:
  - convert
  - flutter
  - overlay-{{overlayId}}
vars:
  overlayId:
  title:
  widgetName:
  specPath:
  designPath:
  widgetPath:
inputs:
  - "{{designPath}}"
  - "{{specPath}}"
  - .stitch/system/DESIGN.md
outputs:
  - "{{widgetPath}}"
checks:
  - id: widget-exists
    cmd: "test -f {{widgetPath}}"
    description: "Overlay widget file exists"
  - id: dart-valid
    cmd: "dart analyze {{widgetPath}}"
    description: "Dart analysis passes"
  - id: uses-theme
    cmd: "grep -q 'Theme.of(context)' {{widgetPath}}"
    description: "Uses Theme.of(context) for styling"
  - id: no-hardcoded-colors
    cmd: "! grep -qE 'Color\\(0x|Colors\\.' {{widgetPath}}"
    description: "No hardcoded colors — uses colorScheme"
  - id: no-router-registration
    cmd: "! grep -q 'GoRoute' {{widgetPath}}"
    description: "Overlay does NOT register a GoRoute"
---

# Convert: {{title}}

Convert the constrained HTML design to a Flutter widget using the **stitch-flutter** skill.

## Inputs
- `{{designPath}}` — HTML design mockup (written in Flutter HTML Glossary vocabulary)
- `{{specPath}}` — Overlay specification
- `.stitch/system/DESIGN.md` — Design system specification

## Important: Overlay ≠ Screen

This is an **overlay widget**, NOT a screen. Key differences:
- **No Scaffold** — the overlay is the content inside `showModalBottomSheet()` or `showDialog()`
- **No GoRoute registration** — overlays are shown imperatively, not via router
- **Return value** — the widget may return data via `Navigator.pop(context, result)`

## Conversion Steps

1. **Read HTML** — Parse `{{designPath}}` and extract:
   - Overlay container element (`.bottom-sheet`, `.dialog`, or `.persistent-bar`)
   - `data-*` attributes → Flutter widget parameters
   - `aria-*` attributes → `Semantics` widgets

2. **Walk the DOM** — Process each glossary element top-down:
   - `.column` → `Column()`
   - `.row` → `Row()`
   - `.card` → `Card()`
   - `.drag-handle` → drag handle widget (for bottom sheets)
   - `.icon[data-name]` → `Icon(Icons.{name})`
   - Text classes → `Text(..., style: textTheme.X)`
   - `data-color` → `colorScheme.X`
   - `data-spacing` → `AppTheme.spaceX`

3. **Generate Dart** — Write `{{widgetPath}}`:
   ```dart
   import 'package:flutter/material.dart';
   // Use the project's actual package name from pubspec.yaml
   import 'package:<pkg>/theme/app_theme.dart';

   class {{widgetName}} extends StatelessWidget {
     const {{widgetName}}({super.key});

     @override
     Widget build(BuildContext context) {
       final theme = Theme.of(context);
       final colorScheme = theme.colorScheme;
       final textTheme = theme.textTheme;

       // Content of the overlay — no Scaffold wrapper
       return ...;
     }
   }
   ```

4. **Do NOT update router** — Overlays are not routed. They are shown via `showModalBottomSheet()` or `showDialog()` from the parent screen.

5. **Verify** — Run `dart analyze {{widgetPath}}`

## Quality Gates

- **No hardcoded colors** — use `colorScheme.X`
- **No hardcoded text styles** — use `textTheme.X`
- **No hardcoded spacing** — use `AppTheme.spaceX`
- **No Scaffold** — overlay content only
- **No GoRoute** — overlays are imperative
- **Use const** — `const` constructor wherever possible
- **Trailing commas** — on every parameter list

## Success Criteria

- `{{widgetPath}}` exists with valid Dart
- Uses `Theme.of(context)` for all styling
- No hardcoded colors, text styles, or spacing values
- No Scaffold wrapper
- No GoRoute registration
- `dart analyze` passes
