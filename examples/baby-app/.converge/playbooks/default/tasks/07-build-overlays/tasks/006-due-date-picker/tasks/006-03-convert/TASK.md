---
id: 006-03-convert
title: "Convert: Due Date Picker"
description: Convert constrained HTML design to Flutter widget for Due Date Picker overlay
dependencies:
  - 006-02-design
tags:
  - convert
  - flutter
  - overlay-due-date-picker
inputs:
  - .stitch/designs/due-date-picker/design.html
  - .stitch/designs/due-date-picker/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - lib/widgets/overlays/due_date_picker/due_date_picker.dart
checks:
  - id: widget-exists
    description: Overlay widget file exists
    cmd: test -f lib/widgets/overlays/due_date_picker/due_date_picker.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/overlays/due_date_picker/due_date_picker.dart
  - id: uses-theme
    description: Uses Theme.of(context) for styling
    cmd: "grep -q 'Theme.of(context)' lib/widgets/overlays/due_date_picker/due_date_picker.dart"
  - id: no-hardcoded-colors
    description: No hardcoded colors — uses colorScheme
    cmd: "! grep -qE 'Color\\(0x|Colors\\.' lib/widgets/overlays/due_date_picker/due_date_picker.dart"
  - id: no-router-registration
    description: Overlay does NOT register a GoRoute
    cmd: "! grep -q 'GoRoute' lib/widgets/overlays/due_date_picker/due_date_picker.dart"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts"]
  prefix: 006
  overlayId: due-date-picker
  title: Due Date Picker
  widgetName: DueDatePicker
  snakeName: due_date_picker
  overlayTaskId: 006-due-date-picker
  parentScreenId: settings
  parentScreenPath: lib/screens/settings/settings_screen.dart
  overlayType: dialog
  specPath: .stitch/designs/due-date-picker/SPEC.md
  metaPath: .stitch/designs/due-date-picker/META.md
  designPath: .stitch/designs/due-date-picker/design.html
  widgetPath: lib/widgets/overlays/due_date_picker/due_date_picker.dart
---

# Convert: Due Date Picker

Convert the constrained HTML design to a Flutter widget using the **stitch-flutter** skill.

## Inputs
- `.stitch/designs/due-date-picker/design.html` — HTML design mockup (written in Flutter HTML Glossary vocabulary)
- `.stitch/designs/due-date-picker/SPEC.md` — Overlay specification
- `.stitch/system/DESIGN.md` — Design system specification

## Important: Overlay ≠ Screen

This is an **overlay widget**, NOT a screen. Key differences:
- **No Scaffold** — the overlay is the content inside `showModalBottomSheet()` or `showDialog()`
- **No GoRoute registration** — overlays are shown imperatively, not via router
- **Return value** — the widget may return data via `Navigator.pop(context, result)`

## Conversion Steps

1. **Read HTML** — Parse `.stitch/designs/due-date-picker/design.html` and extract:
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

3. **Generate Dart** — Write `lib/widgets/overlays/due_date_picker/due_date_picker.dart`:
   ```dart
   import 'package:flutter/material.dart';
   // Use the project's actual package name from pubspec.yaml
   import 'package:<pkg>/theme/app_theme.dart';

   class DueDatePicker extends StatelessWidget {
     const DueDatePicker({super.key});

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

5. **Verify** — Run `dart analyze lib/widgets/overlays/due_date_picker/due_date_picker.dart`

## Quality Gates

- **No hardcoded colors** — use `colorScheme.X`
- **No hardcoded text styles** — use `textTheme.X`
- **No hardcoded spacing** — use `AppTheme.spaceX`
- **No Scaffold** — overlay content only
- **No GoRoute** — overlays are imperative
- **Use const** — `const` constructor wherever possible
- **Trailing commas** — on every parameter list

## Success Criteria

- `lib/widgets/overlays/due_date_picker/due_date_picker.dart` exists with valid Dart
- Uses `Theme.of(context)` for all styling
- No hardcoded colors, text styles, or spacing values
- No Scaffold wrapper
- No GoRoute registration
- `dart analyze` passes
