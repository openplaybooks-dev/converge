---
id: 004-SafeZonesScreen-_NavItem-onTap-2
title: Wire _NavItem.onTap
checks:
  - id: handler-wired
    description: "_NavItem.onTap has real logic in lib/screens/safe_zones/safe_zones_screen.dart (@converge:element SafeZonesScreen-_NavItem-onTap-2)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/safe_zones/safe_zones_screen.dart --id SafeZonesScreen-_NavItem-onTap-2 onTap
---

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
