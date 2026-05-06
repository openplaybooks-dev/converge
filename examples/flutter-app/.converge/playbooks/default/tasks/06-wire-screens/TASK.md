---
id: 06-wire-screens
title: Wire Screens — Connect Providers, Navigation & Interactions
description: Connect Riverpod providers to screens, wire GoRouter navigation, and make all interactive elements functional
references:
  - flutter-managing-state
  - flutter-implementing-navigation-and-routing
  - flutter-building-forms
  - flutter-testing-apps
  - flutter-improving-accessibility
blocking: true
depends_on:
  - 05-add-behavior
outputs:
  - lib/screens/**/*.dart
  - navigations.json
checks:
  - id: no-empty-handlers
    cmd: "node .converge/playbooks/default/tasks/06-wire-screens/004-verify/check-all-handlers.mjs"
    description: No empty/comment-only handlers in any screen or widget file
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: All generated code passes analysis
---

# Wire Screens — Connect Providers, Navigation & Interactions

This epic closes the gap between static UI and a functional app in 4 steps:

1. **Connect Providers** — Import Riverpod providers into screens, replace hardcoded data with provider state
2. **Analyze Navigations** — Scan every screen, extract interactive elements, insert `// @converge:element <elementId>` in Dart before each handler, produce `navigations.json`
3. **Wire Per Screen** — Seed: one parent per screen → one child per broken handler; each child check runs `check-handler.mjs` with `--id` and the marker (not line numbers)
4. **Verify** — End-to-end check with node script that scans all files for empty handlers

Checks use `003-wire-per-screen/seed/check-handler.mjs` (per-element: `@converge:element` marker + `elementId`) and `004-verify/check-all-handlers.mjs` (global) instead of grep to avoid macOS compatibility issues and catch multiline empty handlers.
