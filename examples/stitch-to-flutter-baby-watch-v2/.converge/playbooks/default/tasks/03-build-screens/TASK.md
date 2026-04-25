---
id: 03-build-screens
title: Build Screens (reference-first, state-aware)
description: Per-screen pipeline driven by .stitch/screens.json. When htmlReference is non-empty, use the reference HTML as pixel-truth (link → normalize → convert). Otherwise generate spec and design. Every pipeline ends with a 07-states step for empty/loading/error variants.
references:
  - flutter-building-layouts
  - flutter-animating-apps
  - flutter-improving-accessibility
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
dependencies:
  - 02-design-system
tags:
  - screens
  - flutter
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
  - .stitch/UX.md
  - .stitch/references/ANALYSIS.md
outputs:
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - lib/router/app_router.dart
checks:
  - id: screens-json-exists
    cmd: test -f .stitch/screens.json
    description: screen definitions exist
  - id: screens-created
    cmd: find lib/screens -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'
    description: at least one screen widget was created
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: all generated code passes analysis
  - id: all-screens-have-markers
    cmd: bash -c 'for f in $(find lib/screens -name "*_screen.dart"); do grep -q "@converge:element" "$f" || { echo "$f has no @converge:element marker"; exit 1; }; done; exit 0'
    description: every screen file contains at least one @converge:element marker
  - id: all-screens-have-states
    cmd: bash -c 'count_screens=$(find lib/screens -name "*_screen.dart" | wc -l); count_states=$(find lib/screens -name "*_states.dart" | wc -l); test "$count_states" -ge "$count_screens"'
    description: every screen has a matching *_states.dart file
backlogs:
  - id: noop-buttons
    cmd: "grep -rn 'onPressed: null' lib/screens/ lib/widgets/ 2>/dev/null | grep -v 'disabled' || true"
    description: buttons with null onPressed (non-functional)
    severity: high
  - id: placeholder-text
    cmd: "grep -rn 'Lorem\\|placeholder\\|TODO\\|FIXME\\|Coming soon\\|TBD' lib/screens/ lib/widgets/ 2>/dev/null || true"
    description: placeholder or TODO text left in UI
    severity: medium
  - id: hardcoded-strings
    cmd: "grep -rn \"Text('.*[A-Z].*')\" lib/screens/ 2>/dev/null | head -20 || true"
    description: hardcoded display strings in screens
    severity: low
---

# Build Screens (v2)

The WBS at `./wbs/index.js` reads `.stitch/screens.json` and spawns a per-screen parent + step children. For each screen, the pipeline branches on `htmlReference`:

- **htmlReference is non-empty and the file exists** → 7-step *with-reference* pipeline:
  1. `01-link-reference` — verify and canonicalise the reference HTML
  2. `02-normalize-to-glossary` — mechanically rewrite into Flutter HTML Glossary vocab
  3. `03-convert` — HTML → Dart with pre-seeded `@converge:element` markers
  4. `04-analyze`, `05-split`, `06-lift` — widget extraction (identical to v1)
  7. `07-states` — empty/loading/error variants

- **htmlReference is empty or missing** → 7-step *without-reference* pipeline:
  1. `01-spec` — generate SPEC.md (v1 logic)
  2. `02-design` — generate constrained HTML (v1 logic)
  3. `03-convert`, `04-analyze`, `05-split`, `06-lift` — as above
  7. `07-states` — empty/loading/error variants

Screens are chained sequentially: each screen's `07-states` blocks the next screen's `01-*`.
