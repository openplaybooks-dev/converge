---
id: "{{prefix}}-03-convert"
title: "Convert: {{title}}"
description: "Convert glossary HTML to Flutter widgets for {{title}} using stitch-flutter. Inject @converge:element markers for every interactive element."
skill: stitch-flutter
references:
  - flutter-building-layouts
  - flutter-animating-apps
dependencies:
  - "{{prefix}}-02-design"
tags:
  - convert
  - flutter
  - screen-{{screenId}}
inputs:
  - "{{designPath}}"
  - "{{metaPath}}"
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - "{{screenPath}}"
checks:
  - id: screen-exists
    cmd: "test -f {{screenPath}}"
    description: "screen widget file exists"
  - id: dart-valid
    cmd: "dart analyze {{screenPath}}"
    description: "dart analysis passes"
  - id: uses-theme
    cmd: "grep -q 'Theme.of(context)' {{screenPath}}"
    description: "uses Theme.of(context) for styling"
  - id: no-hardcoded-colors
    cmd: "bash -c 'if grep -qE \"Color\\\\(0x|Colors\\\\.\" {{screenPath}}; then exit 1; else exit 0; fi'"
    description: "no hardcoded colors — uses colorScheme / semantic theme extension"
  - id: has-converge-markers
    cmd: "grep -q '@converge:element' {{screenPath}}"
    description: "screen contains at least one @converge:element marker"
  - id: markers-count-matches-handlers
    cmd: "bash -c 'handlers=$(grep -c \"data-handler=\" {{designPath}} || echo 0); markers=$(grep -c \"@converge:element\" {{screenPath}} || echo 0); test \"$markers\" -ge \"$handlers\"'"
    description: "number of markers >= number of data-handler attributes in glossary HTML"
---

# Convert: {{title}}

Convert the glossary HTML at `{{designPath}}` into a Flutter widget at `{{screenPath}}` using the **stitch-flutter** skill.

## Critical: marker injection

For every interactive element in `{{designPath}}` with a `data-handler="..."` attribute, inject a comment marker on the line immediately preceding the widget:

```dart
// @converge:element {handlerSlug}
GestureDetector(
  onTap: () {
    // bound in phase 06
  },
  child: ...,
),
```

The marker ID = the `data-handler` value from the glossary HTML (verbatim slug, no transformation). Phase 06-wire-screens finds these markers, reads the handler slug, and writes the correct handler body.

**Missing markers were v1's #1 failure mode.** Do not skip this step. Every `data-handler` in the glossary HTML must produce a marker in the Dart file.

### Marker placement rules

- Immediately above the widget whose handler it describes (no blank line between marker and widget).
- One marker per handler. Do not batch.
- When the widget is inside a builder pattern (`itemBuilder`, `builder:`), put the marker inside the builder above the returned widget.
- Format is exactly: `// @converge:element <slug>` — one space after `//`, one space after `:element`, slug verbatim from glossary.

## Inputs

- `{{designPath}}` — glossary HTML (authoritative for structure and interactive elements)
- `{{metaPath}}` — includes the handler inventory
- `.stitch/system/DESIGN.md`, `.stitch/system/tokens.json` — for theming context

## Conversion walk

Process glossary elements top-down:

| Glossary                                 | Flutter widget                                       |
|------------------------------------------|------------------------------------------------------|
| `.scaffold`                              | `Scaffold(…)`                                        |
| `.app-bar`                               | `AppBar(…)`                                          |
| `.body`                                  | Scaffold `body:` contents                            |
| `.bottom-nav`                            | Scaffold `bottomNavigationBar:`                      |
| `.fab`                                   | Scaffold `floatingActionButton:`                     |
| `.column` / `.row`                       | `Column(children: …)` / `Row(children: …)`           |
| `.stack`                                 | `Stack(children: …)`                                 |
| `.expanded`                              | `Expanded(child: …)`                                 |
| `.padding` + `data-p`                    | `Padding(padding: EdgeInsets.all(AppSpacing.X))`     |
| `.sized-box` + `data-w`/`data-h`         | `SizedBox(width: …, height: …)`                      |
| `.card`                                  | `Card(child: …)` (or `Material` + `InkWell` if tappable) |
| `.list-tile`                             | `ListTile(…)` or custom row                          |
| `.ink-well[data-route]`                  | `InkWell(onTap: () => context.push(route), child: …)` |
| `.network-image`                         | `CachedNetworkImage(…)`                              |
| `.placeholder-image`                     | `Container(color: ...)` placeholder                  |
| `.icon[data-name]`                       | `Icon(Icons.<name>)`                                 |
| `.chip`                                  | `Chip(label: …)` or styled `Container`               |
| `.badge`                                 | `Badge(…)`                                           |
| `.avatar`                                | `CircleAvatar(…)`                                    |
| `.filled-btn` / `.elevated-btn`          | `FilledButton` / `ElevatedButton`                    |
| `.text-btn` / `.icon-btn`                | `TextButton` / `IconButton`                          |
| `.title-large`, etc.                     | `Text(..., style: theme.textTheme.titleLarge)`       |
| `data-color="X"`                         | `colorScheme.X` or `appSemantic.X` for extension colors |
| `data-bg="X"`                            | surface / background of parent container              |
| `data-animate="fade-in"`                 | `.animate().fadeIn()` via `flutter_animate`          |

## Skeleton

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../../theme/app_spacing.dart';

class {{widgetName}}Screen extends ConsumerWidget {
  const {{widgetName}}Screen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final appSemantic = theme.extension<AppSemanticColors>()!;

    return Scaffold(
      // ... mechanically converted from glossary elements
      // ... with // @converge:element markers on every interactive child
    );
  }
}
```

Use `ConsumerWidget` (not `StatelessWidget`) so phase 06 can add `ref.read(...).foo()` calls in handler bodies without a rewrite.

## Router wiring

Add a route to `lib/router/app_router.dart`:

```dart
GoRoute(
  path: '{{route}}',
  builder: (context, state) => const {{widgetName}}Screen(),
),
```

If `app_router.dart` doesn't exist yet, create it with a minimal `GoRouter` config. Subsequent screens append to the same file.

## Banned

- `Color(0xFF...)` or `Colors.X` — colors come from `colorScheme` or `appSemantic` only.
- `TextStyle(fontSize: …)` — text styles come from `textTheme` only.
- `EdgeInsets.all(16)` — spacing comes from `AppSpacing` constants.
- Placing the marker on the wrong widget. If a button has a handler, the marker goes above that button's widget call — not above its parent Row or Padding.
- Using `StatelessWidget` for a screen (use `ConsumerWidget` so handlers can read providers).

## Success Criteria

- `{{screenPath}}` exists and passes `dart analyze`
- Uses `Theme.of(context)` throughout
- Zero hardcoded hex colors or `Colors.X`
- Marker count ≥ `data-handler` attribute count in `{{designPath}}`
- Route registered in `lib/router/app_router.dart`
