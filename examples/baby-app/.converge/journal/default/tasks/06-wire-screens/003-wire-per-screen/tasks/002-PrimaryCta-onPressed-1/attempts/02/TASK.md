# Task: 06-wire-screens/003-wire-per-screen/002-PrimaryCta-onPressed-1

Wire the **ElevatedButton** `onPressed` handler in `lib/screens/home/home_screen.dart:105`.

**Current status:** empty
**Required action:** Navigate to tracking entry flow

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