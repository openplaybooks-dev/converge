# Task: 06-wire-screens/003-wire-per-screen/001-BottomNav-onDestinationSelected-1

Wire the **NavigationBar** `onDestinationSelected` handler in `lib/screens/weight_nutrition/weight_nutrition_screen.dart:97`.

**Current status:** empty
**Required action:** context.go to route by index from [/home, /progress, /health-log, /mood, /education]
**Target:** /home, /progress, /health-log, /mood, /education

## Implementation

```dart
onDestinationSelected: (index) => context.go(
  const ["/home","/progress","/health-log","/mood","/education"][index],
),
```

Import `go_router` if not already imported:
```dart
import 'package:go_router/go_router.dart';
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment