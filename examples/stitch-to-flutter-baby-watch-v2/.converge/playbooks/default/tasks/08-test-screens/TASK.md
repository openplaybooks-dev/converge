---
id: 08-test-screens
title: Widget tests per screen
description: Generate a widget test for every screen and every overlay. Pumps the widget with mock providers, asserts reference copy/icons, tests marker handlers, and verifies empty/loading/error states don't crash.
references:
  - flutter-testing-apps
  - flutter-managing-state
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
dependencies:
  - 07-build-overlays
tags:
  - tests
  - flutter
inputs:
  - .stitch/screens.json
  - navigations.json
  - lib/screens/**/*.dart
  - lib/widgets/overlays/**/*.dart
  - lib/providers/**/*.dart
  - lib/data/mock_data.dart
outputs:
  - test/screens/**/*_test.dart
  - test/overlays/**/*_test.dart
  - test/helpers/pump_app.dart
checks:
  - id: test-helper-exists
    cmd: test -f test/helpers/pump_app.dart
    description: pumpApp test helper exists
  - id: tests-exist-for-every-screen
    cmd: bash -c 'screens=$(find lib/screens -name "*_screen.dart" -not -name "*_states.dart" | wc -l); tests=$(find test/screens -name "*_test.dart" 2>/dev/null | wc -l); test "$tests" -ge "$screens"'
    description: every screen has at least one test file
  - id: flutter-test-passes
    cmd: flutter test
    description: flutter test exits 0
---

# Widget tests per screen (v2)

For every screen and every overlay, emit a widget test that:

1. Pumps the widget with a Riverpod `ProviderScope` whose providers are overridden to use mock data from `lib/data/mock_data.dart`.
2. Asserts that headline copy visible in the reference `code.html` is rendered (catches regressions when screens drift from references).
3. For each `@converge:element` marker, taps the widget and asserts the expected state change (provider method called, route pushed, dialog shown).
4. Pumps the widget with provider in loading state → expects the screen's `LoadingState` widget.
5. Pumps the widget with provider in error state → expects the screen's `ErrorState` widget.
6. Pumps with an empty collection → expects the `EmptyState` widget.

## WBS strategy

`wbs/index.js` reads `.stitch/screens.json` and `navigations.json`. For each screen entry (non-overlay), spawns one child test-writing task. For each overlay, spawns one child test-writing task using the overlay-specific test template.

All test tasks run sequentially (one at a time) to avoid `pub get` / test-runner contention during scaffolding.

Before test tasks run, the WBS also ensures `test/helpers/pump_app.dart` exists (generates it once with a common `pumpApp` helper if missing).
