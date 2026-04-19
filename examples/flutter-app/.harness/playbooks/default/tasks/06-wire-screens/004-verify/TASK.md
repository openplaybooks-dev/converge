---
id: 004-verify
title: "Verify — End-to-End Check"
description: Verify all providers connected, navigation works, interactions wired, no dead handlers
references:
  - flutter-testing-apps
  - flutter-improving-accessibility
dependencies:
  - 003-wire-interactions
tags:
  - verification
  - quality
inputs:
  - lib/screens/**/*.dart
  - lib/providers/**/*.dart
  - lib/widgets/**/*.dart
checks:
  - id: dart-analysis-valid
    cmd: dart analyze --no-fatal-infos lib/
    description: Full Dart analysis passes
  - id: no-noop-handlers
    cmd: "! grep -rqE 'onPressed: null[^,]' lib/screens/ lib/widgets/"
    description: No null onPressed handlers
  - id: no-todo-navigation
    cmd: "! grep -rqE 'TODO.*nav|// navigate|// TODO' lib/screens/ lib/widgets/"
    description: No TODO markers remain
---

# Verify — End-to-End Check

Read **flutter-testing-apps** for widget test and integration test patterns. Read **flutter-improving-accessibility** for tap target validation (48x48dp), color contrast ratios (4.5:1), `Semantics` annotation, and `ExcludeSemantics` for decorative elements.

Run all checks and fix any failures with minimal changes.

## Checks

1. `dart analyze --no-fatal-infos lib/` — full Dart static analysis
2. No `onPressed: null` handlers anywhere in `lib/screens/` or `lib/widgets/` (except intentionally disabled buttons)
3. No `TODO` navigation or implementation markers

## Steps

1. Run each check
2. For any failure, make the minimal fix
3. Re-run checks until all pass
