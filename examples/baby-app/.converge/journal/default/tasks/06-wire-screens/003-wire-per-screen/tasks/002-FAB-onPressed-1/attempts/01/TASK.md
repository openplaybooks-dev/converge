# Task: 06-wire-screens/003-wire-per-screen/002-FAB-onPressed-1

Wire the **FloatingActionButton** `onPressed` handler in `lib/screens/weight_nutrition/weight_nutrition_screen.dart:68`.

**Current status:** empty
**Required action:** Open add weight entry form

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