# Task: 06-wire-screens/003-wire-per-screen/001-BeaconEditScreen-TextButton-onPressed-1

Wire the **TextButton** `onPressed` handler in `lib/screens/beacon_edit/beacon_edit_screen.dart:59`.

**Current status:** empty
**Required action:** Save beacon changes

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