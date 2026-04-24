# Task: 06-wire-screens/003-wire-per-screen/004-SafeZonesScreen-_NavItem-onTap-2

Wire the **_NavItem** `onTap` handler for `SafeZonesScreen-_NavItem-onTap-2` in `lib/screens/safe_zones/safe_zones_screen.dart` (marker `// @converge:element SafeZonesScreen-_NavItem-onTap-2` must stay).

**Current status:** empty
**Required action:** Navigate to device tab (index 1)
**Target:** /scan

## Implementation

```dart
onTap: () => context.push('/scan'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element SafeZonesScreen-_NavItem-onTap-2` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment