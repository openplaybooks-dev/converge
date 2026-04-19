# Task: 06-wire-screens/003-wire-per-screen/001-FeaturedExerciseCard-onTap-1

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