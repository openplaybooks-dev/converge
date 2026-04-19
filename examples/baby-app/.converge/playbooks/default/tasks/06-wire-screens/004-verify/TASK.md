---
id: 004-verify
title: "Verify — End-to-End Wiring Check"
description: Verify every screen has real handlers, no empty callbacks, no null onPressed, all bottom navs navigate
references:
  - flutter-testing-apps
  - flutter-improving-accessibility
dependencies:
  - 003-wire-per-screen
tags:
  - verification
  - quality
inputs:
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - lib/providers/**/*.dart
  - navigations.json
checks:
  - id: no-empty-handlers
    cmd: "node .converge/playbooks/default/tasks/06-wire-screens/check-all-handlers.mjs"
    description: No empty/comment-only handlers in any screen or widget file
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: Full Dart analysis passes
---

# Verify — End-to-End Wiring Check

Run all checks and fix any failures with minimal changes.

## Steps

1. Run each check command
2. For any failure, make the minimal fix
3. Re-run checks until all pass

## What to look for

- Empty `onDestinationSelected: (index) {}` — must have `context.go()`
- Empty `onPressed: () {}` or `onPressed: () { // comment }` — must have real logic
- `onPressed: null` — must be replaced with a handler or removed
- Missing `context.go` / `context.push` in bottom nav handlers
- TODO/placeholder comments in navigation code
