---
id: 003-03-convert
title: "Convert: Timeout Picker"
description: Convert constrained HTML design to Flutter widget for Timeout Picker overlay
dependencies:
  - 003-02-design
tags:
  - convert
  - flutter
  - overlay-timeout-picker
inputs:
  - .stitch/designs/timeout-picker/design.html
  - .stitch/designs/timeout-picker/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - lib/widgets/overlays/timeout_picker/timeout_picker.dart
checks:
  - id: widget-exists
    description: Overlay widget file exists
    cmd: test -f lib/widgets/overlays/timeout_picker/timeout_picker.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/overlays/timeout_picker/timeout_picker.dart
  - id: uses-theme
    description: Uses Theme.of(context) for styling
    cmd: "grep -q 'Theme.of(context)' lib/widgets/overlays/timeout_picker/timeout_picker.dart"
  - id: no-hardcoded-colors
    description: No hardcoded colors — uses colorScheme
    cmd: "! grep -qE 'Color\\(0x|Colors\\.' lib/widgets/overlays/timeout_picker/timeout_picker.dart"
  - id: no-router-registration
    description: Overlay does NOT register a GoRoute
    cmd: "! grep -q 'GoRoute' lib/widgets/overlays/timeout_picker/timeout_picker.dart"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts"]
  prefix: 003
  overlayId: timeout-picker
  title: Timeout Picker
  widgetName: TimeoutPicker
  snakeName: timeout_picker
  overlayTaskId: 003-timeout-picker
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/timeout-picker/SPEC.md
  metaPath: .stitch/designs/timeout-picker/META.md
  designPath: .stitch/designs/timeout-picker/design.html
  widgetPath: lib/widgets/overlays/timeout_picker/timeout_picker.dart
---

# Convert: Timeout Picker

Convert the constrained HTML design to a Flutter widget using the **stitch-flutter** skill.

## Inputs
- `.stitch/designs/timeout-picker/design.html` — HTML design mockup (written in Flutter HTML Glossary vocabulary)
- `.stitch/designs/timeout-picker/SPEC.md` — Overlay specification
- `.stitch/system/DESIGN.md` — Design system specification

## Important: Overlay ≠ Screen

This is an **overlay widget**, NOT a screen. Key differences:
- **No Scaffold** — the overlay is the content inside `showModalBottomSheet()` or `showDialog()`
- **No GoRoute registration** — overlays are shown imperatively, not via router
- **Return value** — the widget may return data via `Navigator.pop(context, result)`

## Conversion Steps

1. **Read HTML** — Parse `.stitch/designs/timeout-picker/design.html` and extract:
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

3. **Generate Dart** — Write `lib/widgets/overlays/timeout_picker/timeout_picker.dart`:
   ```dart
   import 'package:flutter/material.dart';
   // Use the project's actual package name from pubspec.yaml
   import 'package:<pkg>/theme/app_theme.dart';

   class TimeoutPicker extends StatelessWidget {
     const TimeoutPicker({super.key});

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

5. **Verify** — Run `dart analyze lib/widgets/overlays/timeout_picker/timeout_picker.dart`

## Quality Gates

- **No hardcoded colors** — use `colorScheme.X`
- **No hardcoded text styles** — use `textTheme.X`
- **No hardcoded spacing** — use `AppTheme.spaceX`
- **No Scaffold** — overlay content only
- **No GoRoute** — overlays are imperative
- **Use const** — `const` constructor wherever possible
- **Trailing commas** — on every parameter list

## Success Criteria

- `lib/widgets/overlays/timeout_picker/timeout_picker.dart` exists with valid Dart
- Uses `Theme.of(context)` for all styling
- No hardcoded colors, text styles, or spacing values
- No Scaffold wrapper
- No GoRoute registration
- `dart analyze` passes
