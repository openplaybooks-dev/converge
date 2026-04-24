---
id: 003-split-CoGuardianCard
title: "Split: CoGuardianCard"
description: Extract CoGuardianCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_detail/widgets
outputs:
  - lib/screens/beacon_detail/widgets/co_guardian_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_detail/widgets/co_guardian_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_detail/widgets/co_guardian_card.dart
vars:
  name: CoGuardianCard
  grep: "Container(\\n              padding: const EdgeInsets.all(32),\\n              decoration: BoxDecoration(\\n                color: Colors.white,\\n                borderRadius: BorderRadius.circular(16),\\n                boxShadow: const [\\n                  BoxShadow("
  description: Co-guardian list card with invite button
  shared: false
  widgetName: CoGuardianCard
  grepString: "Container(\\n              padding: const EdgeInsets.all(32),\\n              decoration: BoxDecoration(\\n                color: Colors.white,\\n                borderRadius: BorderRadius.circular(16),\\n                boxShadow: const [\\n                  BoxShadow("
  widgetPath: lib/screens/beacon_detail/widgets/co_guardian_card.dart
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  screenId: beacon-detail
  screenTitle: null
  subtaskId: 003-split-CoGuardianCard
---

# Split: CoGuardianCard

Extract the `CoGuardianCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_detail/beacon_detail_screen.dart` using grep string: `Container(\n              padding: const EdgeInsets.all(32),\n              decoration: BoxDecoration(\n                color: Colors.white,\n                borderRadius: BorderRadius.circular(16),\n                boxShadow: const [\n                  BoxShadow(`
2. **Create file** — Write `lib/screens/beacon_detail/widgets/co_guardian_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `CoGuardianCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template
