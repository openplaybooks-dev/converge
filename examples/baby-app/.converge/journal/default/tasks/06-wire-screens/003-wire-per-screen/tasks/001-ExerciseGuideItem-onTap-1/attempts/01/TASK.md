# Task: 06-wire-screens/003-wire-per-screen/001-ExerciseGuideItem-onTap-1

Wire the **InkWell** `onTap` handler in `lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart:91`.

**Current status:** empty
**Required action:** Navigate to exercise detail for selected exercise
**Target:** /mindfulness

## Implementation

```dart
onTap: () => context.push('/mindfulness'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment