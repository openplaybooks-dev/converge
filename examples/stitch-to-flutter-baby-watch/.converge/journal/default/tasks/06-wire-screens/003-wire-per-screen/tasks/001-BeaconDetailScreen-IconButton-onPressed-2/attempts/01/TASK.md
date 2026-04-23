# Task: 06-wire-screens/003-wire-per-screen/001-BeaconDetailScreen-IconButton-onPressed-2

Wire the **IconButton** `onPressed` handler in `lib/screens/beacon_detail/beacon_detail_screen.dart:38`.

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
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment