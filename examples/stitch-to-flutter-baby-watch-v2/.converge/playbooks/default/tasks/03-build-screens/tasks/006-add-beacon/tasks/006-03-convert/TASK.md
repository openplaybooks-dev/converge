---
id: 006-03-convert
title: "Convert: Add Beacon"
description: "Convert glossary HTML to Flutter widgets for Add Beacon using stitch-flutter. Inject @converge:element markers for every interactive element."
dependencies:
  - 006-02-normalize-to-glossary
tags:
  - convert
  - flutter
  - screen-add-beacon
inputs:
  - .stitch/designs/add-beacon/design.html
  - .stitch/designs/add-beacon/META.md
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - lib/screens/add_beacon/add_beacon_screen.dart
checks:
  - id: screen-exists
    description: screen widget file exists
    cmd: test -f lib/screens/add_beacon/add_beacon_screen.dart
  - id: dart-valid
    description: dart analysis passes
    cmd: dart analyze lib/screens/add_beacon/add_beacon_screen.dart
  - id: uses-theme
    description: uses Theme.of(context) for styling
    cmd: "grep -q 'Theme.of(context)' lib/screens/add_beacon/add_beacon_screen.dart"
  - id: no-hardcoded-colors
    description: no hardcoded colors — uses colorScheme / semantic theme extension
    cmd: "bash -c 'if grep -qE \"Color\\\\(0x|Colors\\\\.\" lib/screens/add_beacon/add_beacon_screen.dart; then exit 1; else exit 0; fi'"
  - id: has-converge-markers
    description: "screen contains at least one @converge:element marker"
    cmd: "grep -q '@converge:element' lib/screens/add_beacon/add_beacon_screen.dart"
  - id: markers-count-matches-handlers
    description: "number of markers >= number of data-handler attributes in glossary HTML"
    cmd: "bash -c 'handlers=$(grep -c \"data-handler=\" .stitch/designs/add-beacon/design.html || echo 0); markers=$(grep -c \"@converge:element\" lib/screens/add_beacon/add_beacon_screen.dart || echo 0); test \"$markers\" -ge \"$handlers\"'"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts","flutter-animating-apps"]
  prefix: 006
  screenId: add-beacon
  title: Add Beacon
  widgetName: AddBeacon
  snakeName: add_beacon
  route: /devices/add
  screenPath: lib/screens/add_beacon/add_beacon_screen.dart
  widgetsJsonPath: .stitch/designs/add-beacon/widgets.jsonl
  localWidgetsDir: lib/screens/add_beacon/widgets
  screenTaskId: 006-add-beacon
  specPath: .stitch/designs/add-beacon/SPEC.md
  metaPath: .stitch/designs/add-beacon/META.md
  designPath: .stitch/designs/add-beacon/design.html
  linkedHtmlPath: .stitch/designs/add-beacon/code.html
  statesPath: lib/screens/add_beacon/add_beacon_states.dart
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/th_m_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 005-07-states
  variant: 
  variantGroup: 
---

# Convert: Add Beacon

Convert the glossary HTML at `.stitch/designs/add-beacon/design.html` into a Flutter widget at `lib/screens/add_beacon/add_beacon_screen.dart` using the **stitch-flutter** skill.

## Critical: marker injection

For every interactive element in `.stitch/designs/add-beacon/design.html` with a `data-handler="..."` attribute, inject a comment marker on the line immediately preceding the widget:

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

- `.stitch/designs/add-beacon/design.html` — glossary HTML (authoritative for structure and interactive elements)
- `.stitch/designs/add-beacon/META.md` — includes the handler inventory
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

class AddBeaconScreen extends ConsumerWidget {
  const AddBeaconScreen({super.key});

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
  path: '/devices/add',
  builder: (context, state) => const AddBeaconScreen(),
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

- `lib/screens/add_beacon/add_beacon_screen.dart` exists and passes `dart analyze`
- Uses `Theme.of(context)` throughout
- Zero hardcoded hex colors or `Colors.X`
- Marker count ≥ `data-handler` attribute count in `.stitch/designs/add-beacon/design.html`
- Route registered in `lib/router/app_router.dart`
