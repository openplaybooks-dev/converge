# Task: 06-wire-screens/003-wire-per-screen/002-SafeZonesScreen-FloatingActionButton-extendedOnPressed-1

Wire the **FloatingActionButton** `onPressed` handler for `SafeZonesScreen-FloatingActionButton-extendedOnPressed-1` in `lib/screens/safe_zones/safe_zones_screen.dart` (marker `// @converge:element SafeZonesScreen-FloatingActionButton-extendedOnPressed-1` must stay).

**Current status:** empty
**Required action:** Navigate to add safe zone screen
**Target:** /safe-zones/add

## Implementation

```dart
onPressed: () => context.push('/safe-zones/add'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element SafeZonesScreen-FloatingActionButton-extendedOnPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment