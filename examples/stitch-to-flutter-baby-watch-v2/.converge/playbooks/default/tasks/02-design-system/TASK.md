---
id: 02-design-system
title: Design System (import, don't regenerate)
description: Adopt the dominant reference design system as the app's design system. Import DESIGN.md, extract tokens, emit Flutter theme, generate design references for stitch-generate.
blocking: true
dependencies:
  - 01-prepare-requirements
outputs:
  - .stitch/system/DECISION.md
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
  - lib/theme/app_theme.dart
  - .stitch/system/META.md
  - .stitch/system/single-screen.html
  - .stitch/system/multi-state-screen.html
  - .stitch/system/celebration-screen.html
  - lib/main.dart
  - lib/app.dart
  - lib/router/app_router.dart
checks:
  - id: decision-md-exists
    cmd: test -f .stitch/system/DECISION.md
    description: Design system decision recorded
  - id: design-md-exists
    cmd: test -f .stitch/system/DESIGN.md
    description: DESIGN.md exists
  - id: tokens-json-exists
    cmd: test -f .stitch/system/tokens.json
    description: tokens.json exists
  - id: tokens-json-valid
    cmd: python3 -c "import json; json.load(open('.stitch/system/tokens.json'))"
    description: tokens.json is valid JSON
  - id: theme-exists
    cmd: test -f lib/theme/app_theme.dart
    description: Flutter theme file exists
  - id: meta-md-exists
    cmd: test -f .stitch/system/META.md
    description: META.md exists
  - id: app-entry-exists
    cmd: test -f lib/main.dart && test -f lib/app.dart && test -f lib/router/app_router.dart
    description: main.dart, app.dart, and router stub exist
  - id: app-boots
    cmd: flutter test
    description: app compiles and no-op test run passes
---

# Design System (v2 — import)

v1 generated a fresh DESIGN.md from UX + idea. v2 **adopts** the dominant reference design system — `.stitch/references/` already contains two fully-specified design systems and the references were drawn to those systems. Recreating the design system invites drift.

## Flow

1. **001-pick-design-system** — compare `.stitch/references/*/DESIGN.md` files (serene_guardian, lullaby_minimal, …). Pick the one that best matches observed screens (usually the more widely-cited one per ANALYSIS.md). Record the choice.
2. **002-emit-design-md** — copy chosen DESIGN.md to `.stitch/system/DESIGN.md`, prefixing with a provenance block noting the source directory.
3. **003-extract-tokens** — parse Tailwind config from reference `code.html` files into `.stitch/system/tokens.json` (single source of truth for colors, radii, fonts, shadows).
4. **004-emit-flutter-theme** — deterministically emit `lib/theme/app_theme.dart` from tokens.json. No AI creative judgment — straight mechanical mapping.
5. **005-generate-design-references** — produce `.stitch/system/{META.md, *.html}` as glossary-vocabulary reference mockups for stitch-generate's example matching step in phase 03.
6. **006-emit-app-entry** — write `lib/main.dart`, `lib/app.dart`, and a `lib/router/app_router.dart` stub so the project is bootable immediately. Phase 03 appends real routes to the router as each screen is generated.
