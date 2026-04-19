---
id: 003-MoodBanner-onTap-1
title: Wire GestureDetector.onTap
checks:
  - id: handler-wired
    description: "GestureDetector.onTap has real logic at lib/screens/mindfulness/widgets/mood_banner.dart:17"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/mindfulness/widgets/mood_banner.dart 17 onTap
---

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
