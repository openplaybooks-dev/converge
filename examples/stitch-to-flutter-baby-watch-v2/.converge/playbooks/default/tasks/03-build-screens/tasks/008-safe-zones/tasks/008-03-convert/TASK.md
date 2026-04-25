---
id: 008-03-convert
title: "Convert: Safe Zones"
description: "Convert glossary HTML to Flutter widgets for Safe Zones using stitch-flutter. Inject @converge:element markers for every interactive element."
dependencies:
  - 008-02-normalize-to-glossary
tags:
  - convert
  - flutter
  - screen-safe-zones
inputs:
  - .stitch/designs/safe-zones/design.html
  - .stitch/designs/safe-zones/META.md
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
checks:
  - id: screen-exists
    description: screen widget file exists
    cmd: test -f lib/screens/safe_zones/safe_zones_screen.dart
  - id: dart-valid
    description: dart analysis passes
    cmd: dart analyze lib/screens/safe_zones/safe_zones_screen.dart
  - id: uses-theme
    description: uses Theme.of(context) for styling
    cmd: "grep -q 'Theme.of(context)' lib/screens/safe_zones/safe_zones_screen.dart"
  - id: no-hardcoded-colors
    description: no hardcoded colors — uses colorScheme / semantic theme extension
    cmd: "bash -c 'if grep -qE \"Color\\\\(0x|Colors\\\\.\" lib/screens/safe_zones/safe_zones_screen.dart; then exit 1; else exit 0; fi'"
  - id: has-converge-markers
    description: "screen contains at least one @converge:element marker"
    cmd: "grep -q '@converge:element' lib/screens/safe_zones/safe_zones_screen.dart"
  - id: markers-count-matches-handlers
    description: "number of markers >= number of data-handler attributes in glossary HTML"
    cmd: "bash -c 'handlers=$(grep -c \"data-handler=\" .stitch/designs/safe-zones/design.html || echo 0); markers=$(grep -c \"@converge:element\" lib/screens/safe_zones/safe_zones_screen.dart || echo 0); test \"$markers\" -ge \"$handlers\"'"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts","flutter-animating-apps"]
  prefix: 008
  screenId: safe-zones
  title: Safe Zones
  widgetName: SafeZones
  snakeName: safe_zones
  route: /security
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  widgetsJsonPath: .stitch/designs/safe-zones/widgets.jsonl
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenTaskId: 008-safe-zones
  specPath: .stitch/designs/safe-zones/SPEC.md
  metaPath: .stitch/designs/safe-zones/META.md
  designPath: .stitch/designs/safe-zones/design.html
  linkedHtmlPath: .stitch/designs/safe-zones/code.html
  statesPath: lib/screens/safe_zones/safe_zones_states.dart
  htmlReference: .stitch/references/safe_zones/code.html
  htmlReferenceInput: "  - \".stitch/references/safe_zones/code.html\"\n"
  screenshotReference: .stitch/references/safe_zones/screen.png
  screenshotReferenceInput: "  - \".stitch/references/safe_zones/screen.png\"\n"
  prevScreenLastId: 007-07-states
  variant: 
  variantGroup: 
---

# Convert: Safe Zones

Convert the glossary HTML at `.stitch/designs/safe-zones/design.html` into a Flutter widget at `lib/screens/safe_zones/safe_zones_screen.dart` using the **stitch-flutter** skill.

## Critical: marker injection

For every interactive element in `.stitch/designs/safe-zones/design.html` with a `data-handler="..."` attribute, inject a comment marker on the line immediately preceding the widget:

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

- `.stitch/designs/safe-zones/design.html` — glossary HTML (authoritative for structure and interactive elements)
- `.stitch/designs/safe-zones/META.md` — includes the handler inventory
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

class SafeZonesScreen extends ConsumerWidget {
  const SafeZonesScreen({super.key});

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
  path: '/security',
  builder: (context, state) => const SafeZonesScreen(),
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

- `lib/screens/safe_zones/safe_zones_screen.dart` exists and passes `dart analyze`
- Uses `Theme.of(context)` throughout
- Zero hardcoded hex colors or `Colors.X`
- Marker count ≥ `data-handler` attribute count in `.stitch/designs/safe-zones/design.html`
- Route registered in `lib/router/app_router.dart`
