---
id: 011-03-convert
title: "Convert: Onboarding"
description: Convert constrained HTML design to Flutter widgets for Onboarding using stitch-flutter
dependencies:
  - 011-02-design
tags:
  - convert
  - flutter
  - screen-onboarding
inputs:
  - .stitch/designs/onboarding/design.html
  - .stitch/designs/onboarding/SPEC.md
  - .stitch/system/DESIGN.md
outputs:
  - lib/screens/onboarding/onboarding_screen.dart
checks:
  - id: screen-exists
    description: Screen widget file exists
    cmd: test -f lib/screens/onboarding/onboarding_screen.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/onboarding/onboarding_screen.dart
  - id: uses-theme
    description: Uses Theme.of(context) for styling
    cmd: "grep -q 'Theme.of(context)' lib/screens/onboarding/onboarding_screen.dart"
  - id: no-hardcoded-colors
    description: No hardcoded colors — uses colorScheme
    cmd: "grep -qE 'Color\\(0x|Colors\\.' lib/screens/onboarding/onboarding_screen.dart && exit 1 || exit 0"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts","flutter-animating-apps"]
  prefix: 011
  screenId: onboarding
  title: Onboarding
  widgetName: Onboarding
  snakeName: onboarding
  route: /onboarding
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  widgetsJsonPath: .stitch/designs/onboarding/widgets.jsonl
  localWidgetsDir: lib/screens/onboarding/widgets
  screenTaskId: 011-onboarding
  specPath: .stitch/designs/onboarding/SPEC.md
  metaPath: .stitch/designs/onboarding/META.md
  designPath: .stitch/designs/onboarding/design.html
  prevScreenLastId: 010-06-lift
  htmlReference: .stitch/references/babyguard_onboarding_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/code.html\"\n"
---

# Convert: Onboarding

Convert the constrained HTML design to a pixel-perfect Flutter widget using the **stitch-flutter** skill.

## Inputs
- `.stitch/designs/onboarding/design.html` — HTML design mockup (written in Flutter HTML Glossary vocabulary)
- `.stitch/designs/onboarding/SPEC.md` — Screen specification
- `.stitch/system/DESIGN.md` — Design system specification

## How It Works

The HTML mockup uses the **Flutter HTML Glossary** — a constrained vocabulary where every HTML class and `data-*` attribute maps 1:1 to a Flutter widget. This enables mechanical, pixel-perfect conversion.

## Conversion Steps

1. **Read HTML** — Parse `.stitch/designs/onboarding/design.html` and extract:
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

3. **Generate Dart** — Write `lib/screens/onboarding/onboarding_screen.dart`:
   ```dart
   import 'package:flutter/material.dart';
   import 'package:cached_network_image/cached_network_image.dart';
   import 'package:flutter_animate/flutter_animate.dart';
   import 'package:folio/theme/app_theme.dart';

   class OnboardingScreen extends StatelessWidget {
     const OnboardingScreen({super.key});

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
     path: '/onboarding',
     builder: (context, state) => const OnboardingScreen(),
   ),
   ```

5. **Verify** — Run `dart analyze lib/screens/onboarding/onboarding_screen.dart`

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

- `lib/screens/onboarding/onboarding_screen.dart` exists with valid Dart
- Uses `Theme.of(context)` for all styling (colors, text, shapes)
- No hardcoded colors, text styles, or spacing values
- Route added to `app_router.dart`
- `dart analyze` passes
