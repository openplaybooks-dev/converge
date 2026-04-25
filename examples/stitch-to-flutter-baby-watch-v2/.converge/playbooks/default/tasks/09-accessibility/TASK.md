---
id: 09-accessibility
title: Accessibility pass per screen
description: For each screen and overlay, ensure Semantics labels cover every interactive widget, tap targets are >= 44x44, color contrast meets WCAG AA, and decorative images exclude Semantics.
references:
  - flutter-improving-accessibility
  - flutter-testing-apps
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
dependencies:
  - 08-test-screens
tags:
  - a11y
  - accessibility
  - flutter
inputs:
  - .stitch/screens.json
  - navigations.json
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - lib/widgets/overlays/**/*.dart
  - .stitch/system/tokens.json
outputs:
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - lib/widgets/overlays/**/*.dart
  - test/accessibility/**/*_a11y_test.dart
checks:
  - id: a11y-tests-exist
    cmd: find test/accessibility -name "*_a11y_test.dart" -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'
    description: at least one a11y test file exists
  - id: a11y-tests-pass
    cmd: flutter test test/accessibility/
    description: accessibility tests pass
  - id: no-unlabeled-icon-buttons
    cmd: bash -c 'count=$(grep -rnE "IconButton\\(" lib/ 2>/dev/null | xargs -I{} bash -c "grep -A 5 \"IconButton(\" \"{}\" | grep -cq \"tooltip:\\|Semantics\\|excludeFromSemantics\\|semanticLabel\" || echo MISS" 2>/dev/null | grep -c MISS || echo 0); test "$count" -eq 0'
    description: every IconButton has either tooltip, Semantics wrapper, or semanticLabel
---

# Accessibility pass (v2)

For every screen and overlay:

1. **Semantics labels** — every `IconButton`, bare `Icon` inside an `InkWell`/`GestureDetector`, custom tappable Container without a visible text label must have a Semantics wrapper (or `semanticLabel` parameter).
2. **Tap targets** — every interactive widget has an effective size of at least 44×44 logical pixels (`MaterialTapTargetSize.padded`, or wrapped in a 44×44 `SizedBox`/`Container`).
3. **Color contrast** — text foreground/background color roles must meet WCAG AA (4.5:1 for body, 3:1 for large text). Use `.stitch/system/tokens.json` to compute contrast ratios; flag any role pair used in practice that fails.
4. **Decorative images** — `CachedNetworkImage` / `Image` used purely decoratively must be wrapped with `ExcludeSemantics(child: …)` OR use `const Semantics(excludeSemantics: true, child: …)`.
5. **Tests** — emit `test/accessibility/<screenId>_a11y_test.dart` using Flutter's `SemanticsHandle` and `Guideline` helpers to assert: tap targets, contrast, labeled buttons.

## WBS

`wbs/index.js` spawns one child per screen (and per overlay) that performs steps 1-5 for that widget specifically. Sequential to avoid concurrent edits on shared widgets in `lib/widgets/`.
