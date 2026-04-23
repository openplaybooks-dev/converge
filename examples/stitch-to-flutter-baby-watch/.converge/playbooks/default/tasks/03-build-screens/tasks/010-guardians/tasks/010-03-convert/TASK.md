---
id: 010-03-convert
title: "Convert: Co-Guardians"
description: Convert constrained HTML design to Flutter widgets for Co-Guardians using stitch-flutter
dependencies:
  - 010-02-design
tags:
  - convert
  - flutter
  - screen-guardians
inputs:
  - .stitch/designs/guardians/design.html
  - .stitch/designs/guardians/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - lib/screens/guardians/guardians_screen.dart
checks:
  - id: screen-exists
    description: Screen widget file exists
    cmd: test -f lib/screens/guardians/guardians_screen.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/guardians/guardians_screen.dart
  - id: uses-theme
    description: Uses Theme.of(context) for styling
    cmd: "grep -q 'Theme.of(context)' lib/screens/guardians/guardians_screen.dart"
  - id: no-hardcoded-colors
    description: No hardcoded colors — uses colorScheme
    cmd: "! grep -qE 'Color\\(0x|Colors\\.' lib/screens/guardians/guardians_screen.dart"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts","flutter-animating-apps"]
  prefix: 010
  screenId: guardians
  title: Co-Guardians
  widgetName: Guardians
  snakeName: guardians
  route: /guardians
  screenPath: lib/screens/guardians/guardians_screen.dart
  widgetsJsonPath: .stitch/designs/guardians/widgets.jsonl
  localWidgetsDir: lib/screens/guardians/widgets
  screenTaskId: 010-guardians
  specPath: .stitch/designs/guardians/SPEC.md
  metaPath: .stitch/designs/guardians/META.md
  designPath: .stitch/designs/guardians/design.html
  prevScreenLastId: 009-06-lift
  htmlReference: .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  htmlReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/code.html\"\n"
---

# Convert: Co-Guardians

Convert the constrained HTML design to a pixel-perfect Flutter widget using the **stitch-flutter** skill.

## Inputs
- `.stitch/designs/guardians/design.html` — HTML design mockup (written in Flutter HTML Glossary vocabulary)
- `.stitch/designs/guardians/SPEC.md` — Screen specification
- `.stitch/system/DESIGN.md` — Design system specification

## How It Works

The HTML mockup uses the **Flutter HTML Glossary** — a constrained vocabulary where every HTML class and `data-*` attribute maps 1:1 to a Flutter widget. This enables mechanical, pixel-perfect conversion.

## Conversion Steps

1. **Read HTML** — Parse `.stitch/designs/guardians/design.html` and extract:
   - `:root` CSS tokens → update `lib/theme/app_theme.dart` if new tokens found
   - `.scaffold` element tree → this is the conversion entry point
   - `data-*` attributes → Flutter widget parameters
   - `data-animate` attributes → `flutter_animate` chains
   - `aria-*` attributes → `Semantics` widgets

2. **Walk the DOM** — Process each glossary element top-down:
   - `.scaffold` → `Scaffold()`
   - `.app-bar` → `AppBar()`
   - `.column` → `Column()`
   - `.row` → `Row()`
   - `.card` → `Card()`
   - `.ink-well[data-route]` → `InkWell(onTap: () => context.push(route))`
   - `.network-image` → `CachedNetworkImage()`
   - `.icon[data-name]` → `Icon(Icons.{name})`
   - Text classes (`.title-large`, `.body-medium`, etc.) → `Text(..., style: textTheme.X)`
   - `data-color` → `colorScheme.X`
   - `data-spacing` → `AppTheme.spaceX`
   - `data-radius` → `AppTheme.radiusX`

3. **Generate Dart** — Write `lib/screens/guardians/guardians_screen.dart`:
   ```dart
   import 'package:flutter/material.dart';
   import 'package:cached_network_image/cached_network_image.dart';
   import 'package:flutter_animate/flutter_animate.dart';
   import 'package:folio/theme/app_theme.dart';

   class GuardiansScreen extends StatelessWidget {
     const GuardiansScreen({super.key});

     @override
     Widget build(BuildContext context) {
       final theme = Theme.of(context);
       final colorScheme = theme.colorScheme;
       final textTheme = theme.textTheme;

       return Scaffold(
         // ... mechanically converted from glossary elements
       );
     }
   }
   ```

4. **Update router** — Add route to `lib/router/app_router.dart`:
   ```dart
   GoRoute(
     path: '/guardians',
     builder: (context, state) => const GuardiansScreen(),
   ),
   ```

5. **Verify** — Run `dart analyze lib/screens/guardians/guardians_screen.dart`

## Reference Skills

- Read **flutter-building-layouts** for constraint rules (constraints down, sizes up), avoiding unbounded constraints in flex boxes, and when to use `Expanded` vs `Flexible` vs `SizedBox`.
- Read **flutter-animating-apps** for Hero transition setup, implicit vs explicit animations, and staggered animation patterns.

## Quality Gates

- **No hardcoded colors** — `Color(0xFF...)` and `Colors.blue` are banned; use `colorScheme.X`
- **No hardcoded text styles** — `TextStyle(fontSize: 16)` is banned; use `textTheme.X`
- **No hardcoded spacing** — `EdgeInsets.all(16)` is banned; use `AppTheme.spaceMd`
- **No Container abuse** — prefer `SizedBox`, `Padding`, `DecoratedBox` when Container is overkill
- **Use const** — `const` constructor wherever possible
- **Trailing commas** — on every parameter list

## Success Criteria

- `lib/screens/guardians/guardians_screen.dart` exists with valid Dart
- Uses `Theme.of(context)` for all styling (colors, text, shapes)
- No hardcoded colors, text styles, or spacing values
- Route added to `app_router.dart`
- `dart analyze` passes
