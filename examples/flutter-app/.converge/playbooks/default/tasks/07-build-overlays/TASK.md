---
id: 07-build-overlays
title: Build Overlays — Spec, Design, Convert, Connect, Mount
description: Per-overlay pipeline for dynamic views (bottom sheets, dialogs, persistent bars)
references:
  - flutter-implementing-navigation-and-routing
  - flutter-animating-apps
seeds:
  - type: nodejs
    path: ./seeds/build-overlays.seed.js
blocking: true
dependencies:
  - 03-build-screens
tags:
  - overlays
  - flutter
inputs:
  - .stitch/screens.json
  - .stitch/SITE.md
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/**/*.dart
checks:
  - id: overlays-created
    cmd: find lib/widgets/overlays -name '*.dart' 2>/dev/null | wc -l | awk '{if ($1 >= 2) exit 0; exit 1}'
    description: At least 2 overlay widgets were created
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: All generated code passes analysis
---

# Build Overlays

Spawns a template-based 5-step pipeline per overlay (bottom sheet, dialog, persistent bar).

## Overlay Discovery

The WBS discovers overlays via two methods, in order:

1. **`screens.json`** — looks for entries with `route` starting with `overlay:`. Each entry should include `parentScreenId` and `overlayType`.
2. **AI fallback** — if no overlay entries exist in `screens.json`, the WBS uses `ctx.ai.ask()` to discover overlays from `.stitch/SITE.md`, `.stitch/UX.md`, and existing parent screen `.dart` files. It finds placeholder triggers (`Placeholder()`, `SnackBar` stubs, `debugPrint` stubs) and cross-references with UX documentation to build the overlay list.

This means the pipeline works whether or not the upstream `004-breakdown-ux-to-screens` task produced overlay entries in `screens.json`.

Task content comes from `wbs/templates/overlay/` — TASK.md files with `{{var}}` placeholders substituted at render time, matching the same template-ref pattern used by `03-build-screens`.

## Pipeline Steps

1. **Overlay Specification** *(plan mode)* — explore parent screen spec + DESIGN.md + UX.md, output `.stitch/designs/{overlayId}/SPEC.md`
2. **Generate HTML Design** — generate `.stitch/designs/{overlayId}/design.html` using spec + meta + Flutter HTML Glossary
3. **Convert to Flutter Widget** — transform HTML into `lib/widgets/overlays/{id}/{widget_name}.dart` (no Scaffold, no GoRoute)
4. **Connect Provider** — wire Riverpod provider, add missing actions, connect interactive controls
5. **Mount in Parent** — modify parent screen to import overlay and wire trigger callback (`showModalBottomSheet`, `showDialog`)

Overlays are chained sequentially so each completes before the next begins.
