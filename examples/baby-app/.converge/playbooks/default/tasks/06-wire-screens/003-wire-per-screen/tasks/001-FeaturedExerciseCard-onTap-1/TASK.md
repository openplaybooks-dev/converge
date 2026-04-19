---
id: 001-FeaturedExerciseCard-onTap-1
title: Wire GestureDetector.onTap
checks:
  - id: handler-wired
    description: "GestureDetector.onTap has real logic at lib/screens/mindfulness/widgets/featured_exercise_card.dart:19"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/mindfulness/widgets/featured_exercise_card.dart 19 onTap
---

Wire the **GestureDetector** `onTap` handler in `lib/screens/mindfulness/widgets/featured_exercise_card.dart:19`.

**Current status:** empty
**Required action:** Navigate to exercise detail screen for Deep Breathing
**Target:** /mindfulness/exercise/:id

## Implementation

```dart
onTap: () => context.push('/mindfulness/exercise/:id'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
