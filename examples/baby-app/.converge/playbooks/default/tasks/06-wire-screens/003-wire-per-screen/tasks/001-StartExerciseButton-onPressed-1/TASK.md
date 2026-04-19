---
id: 001-StartExerciseButton-onPressed-1
title: Wire ElevatedButton.onPressed
checks:
  - id: handler-wired
    description: "ElevatedButton.onPressed has real logic at lib/screens/exercise_detail/widgets/start_exercise_button.dart:24"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/exercise_detail/widgets/start_exercise_button.dart 24 onPressed
---

Wire the **ElevatedButton** `onPressed` handler in `lib/screens/exercise_detail/widgets/start_exercise_button.dart:24`.

**Current status:** empty
**Required action:** Start the exercise timer/guided session

## Implementation

Wire to the appropriate action based on context:
- Navigation: `context.push('/route')`
- Provider mutation: `ref.read(provider.notifier).method()`
- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`
- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
