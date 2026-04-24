# Task: 06-wire-screens/003-wire-per-screen/007-SafeZonesScreen-_ZoneCard-IconButton-onPressed-1

Wire the **IconButton** `onPressed` handler for `SafeZonesScreen-_ZoneCard-IconButton-onPressed-1` in `lib/screens/safe_zones/safe_zones_screen.dart` (marker `// @converge:element SafeZonesScreen-_ZoneCard-IconButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Edit the safe zone
**Target:** /safe-zones/:id/edit

## Implementation

```dart
onPressed: () => context.push('/safe-zones/:id/edit'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element SafeZonesScreen-_ZoneCard-IconButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment