---
id: 001-BeaconDetailScreen-IconButton-onPressed-2
title: Wire IconButton.onPressed
checks:
  - id: handler-wired
    description: "IconButton.onPressed has real logic in lib/screens/beacon_detail/beacon_detail_screen.dart (@converge:element BeaconDetailScreen-IconButton-onPressed-2)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/beacon_detail/beacon_detail_screen.dart --id BeaconDetailScreen-IconButton-onPressed-2 onPressed
---

Wire the **IconButton** `onPressed` handler for `BeaconDetailScreen-IconButton-onPressed-2` in `lib/screens/beacon_detail/beacon_detail_screen.dart` (marker `// @converge:element BeaconDetailScreen-IconButton-onPressed-2` must stay).

**Current status:** empty
**Required action:** Show more options menu

## Implementation

Wire to the appropriate action based on context:
- Navigation: `context.push('/route')`
- Provider mutation: `ref.read(provider.notifier).method()`
- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`
- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element BeaconDetailScreen-IconButton-onPressed-2` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
