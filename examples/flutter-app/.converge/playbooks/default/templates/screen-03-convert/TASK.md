---
title: "Convert: {{title}}"
description: "Convert constrained HTML design to Flutter widgets for {{title}} using stitch-flutter"
skill: stitch-flutter
references:
  - flutter-building-layouts
  - flutter-animating-apps
tags:
  - convert
  - flutter
  - screen-{{screenId}}
vars:
  screenId:
  title:
  route:
  widgetName:
  specPath:
  designPath:
  screenPath:
inputs:
  - "{{designPath}}"
  - "{{specPath}}"
  - .stitch/system/DESIGN.md
outputs:
  - "{{screenPath}}"
checks:
  - id: screen-exists
    cmd: "test -f {{screenPath}}"
    description: "Screen widget file exists"
  - id: dart-valid
    cmd: "dart analyze {{screenPath}}"
    description: "Dart analysis passes"
  - id: uses-theme
    cmd: "grep -q 'Theme.of(context)' {{screenPath}}"
    description: "Uses Theme.of(context) for styling"
  - id: no-hardcoded-colors
    cmd: "! grep -qE 'Color\\(0x|Colors\\.' {{screenPath}}"
    description: "No hardcoded colors — uses colorScheme"
---

# Convert: {{title}}

Convert the constrained HTML design to a pixel-perfect Flutter widget using the **stitch-flutter** skill.

## Inputs
- `{{designPath}}` — HTML design mockup (written in Flutter HTML Glossary vocabulary)
- `{{specPath}}` — Screen specification
- `.stitch/system/DESIGN.md` — Design system specification

## How It Works

The HTML mockup uses the **Flutter HTML Glossary** — a constrained vocabulary where every HTML class and `data-*` attribute maps 1:1 to a Flutter widget. This enables mechanical, pixel-perfect conversion.

## Conversion Steps

1. **Read HTML** — Parse `{{designPath}}` and extract:
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

3. **Generate Dart** — Write `{{screenPath}}`:
   ```dart
   import 'package:flutter/material.dart';
   import 'package:cached_network_image/cached_network_image.dart';
   import 'package:flutter_animate/flutter_animate.dart';
   import 'package:folio/theme/app_theme.dart';

   class {{widgetName}}Screen extends StatelessWidget {
     const {{widgetName}}Screen({super.key});

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
     path: '{{route}}',
     builder: (context, state) => const {{widgetName}}Screen(),
   ),
   ```

5. **Verify** — Run `dart analyze {{screenPath}}`

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

- `{{screenPath}}` exists with valid Dart
- Uses `Theme.of(context)` for all styling (colors, text, shapes)
- No hardcoded colors, text styles, or spacing values
- Route added to `app_router.dart`
- `dart analyze` passes
