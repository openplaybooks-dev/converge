# Task: 06-wire-screens/003-wire-per-screen/003-MoodBanner-onTap-1

Wire the **GestureDetector** `onTap` handler in `lib/screens/mindfulness/widgets/mood_banner.dart:17`.

**Current status:** empty
**Required action:** Open mood logging bottom sheet or navigate to mood screen
**Target:** /mood

## Implementation

```dart
onTap: () => context.push('/mood'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment