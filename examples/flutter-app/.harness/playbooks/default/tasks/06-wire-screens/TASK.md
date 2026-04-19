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
dependencies:
  - 05-add-behavior
outputs:
  - lib/screens/**/*.dart
checks:
  - id: dart-analysis-valid
    cmd: dart analyze --no-fatal-infos lib/
    description: All generated code passes analysis
  - id: no-noop-handlers
    cmd: "! grep -rqE 'onPressed: null' lib/screens/ lib/widgets/"
    description: No null onPressed handlers
  - id: no-todo-navigation
    cmd: "! grep -rqE 'TODO.*nav|// navigate' lib/screens/ lib/widgets/"
    description: No TODO navigation markers
---

# Wire Screens — Connect Providers, Navigation & Interactions

This epic closes the gap between static UI and a functional app in 4 horizontal layers:

1. **Connect Providers** — Import Riverpod providers into screens, replace hardcoded data with provider state
2. **Wire Navigation** — Make bottom nav, tappable items, and back buttons navigate via GoRouter
3. **Wire Interactions** — Make tabs, filters, buttons, and forms functional
4. **Verify** — End-to-end check that all wiring is correct

Layers execute sequentially. Each layer applies the same type of change across all screens.
