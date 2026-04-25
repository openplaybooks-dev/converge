---
id: 006-03-convert
title: "Convert: Test Alert Countdown"
description: Convert constrained HTML design to Flutter widget for Test Alert Countdown overlay
dependencies:
  - 006-02-design
tags:
  - convert
  - flutter
  - overlay-test-alert
inputs:
  - .stitch/designs/test-alert/design.html
  - .stitch/designs/test-alert/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - lib/widgets/overlays/test_alert/test_alert.dart
checks:
  - id: widget-exists
    description: Overlay widget file exists
    cmd: test -f lib/widgets/overlays/test_alert/test_alert.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/overlays/test_alert/test_alert.dart
  - id: uses-theme
    description: Uses Theme.of(context) for styling
    cmd: "grep -q 'Theme.of(context)' lib/widgets/overlays/test_alert/test_alert.dart"
  - id: no-hardcoded-colors
    description: No hardcoded colors — uses colorScheme
    cmd: "! grep -qE 'Color\\(0x|Colors\\.' lib/widgets/overlays/test_alert/test_alert.dart"
  - id: no-router-registration
    description: Overlay does NOT register a GoRoute
    cmd: "! grep -q 'GoRoute' lib/widgets/overlays/test_alert/test_alert.dart"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts"]
  prefix: 006
  overlayId: test-alert
  title: Test Alert Countdown
  widgetName: TestAlert
  snakeName: test_alert
  overlayTaskId: 006-test-alert
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/test-alert/SPEC.md
  metaPath: .stitch/designs/test-alert/META.md
  designPath: .stitch/designs/test-alert/design.html
  widgetPath: lib/widgets/overlays/test_alert/test_alert.dart
---

# Convert: Test Alert Countdown

Convert the constrained HTML design to a Flutter widget using the **stitch-flutter** skill.

## Inputs
- `.stitch/designs/test-alert/design.html` — HTML design mockup (written in Flutter HTML Glossary vocabulary)
- `.stitch/designs/test-alert/SPEC.md` — Overlay specification
- `.stitch/system/DESIGN.md` — Design system specification

## Important: Overlay ≠ Screen

This is an **overlay widget**, NOT a screen. Key differences:
- **No Scaffold** — the overlay is the content inside `showModalBottomSheet()` or `showDialog()`
- **No GoRoute registration** — overlays are shown imperatively, not via router
- **Return value** — the widget may return data via `Navigator.pop(context, result)`

## Conversion Steps

1. **Read HTML** — Parse `.stitch/designs/test-alert/design.html` and extract:
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

3. **Generate Dart** — Write `lib/widgets/overlays/test_alert/test_alert.dart`:
   ```dart
   import 'package:flutter/material.dart';
   // Use the project's actual package name from pubspec.yaml
   import 'package:<pkg>/theme/app_theme.dart';

   class TestAlert extends StatelessWidget {
     const TestAlert({super.key});

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

5. **Verify** — Run `dart analyze lib/widgets/overlays/test_alert/test_alert.dart`

## Quality Gates

- **No hardcoded colors** — use `colorScheme.X`
- **No hardcoded text styles** — use `textTheme.X`
- **No hardcoded spacing** — use `AppTheme.spaceX`
- **No Scaffold** — overlay content only
- **No GoRoute** — overlays are imperative
- **Use const** — `const` constructor wherever possible
- **Trailing commas** — on every parameter list

## Success Criteria

- `lib/widgets/overlays/test_alert/test_alert.dart` exists with valid Dart
- Uses `Theme.of(context)` for all styling
- No hardcoded colors, text styles, or spacing values
- No Scaffold wrapper
- No GoRoute registration
- `dart analyze` passes
