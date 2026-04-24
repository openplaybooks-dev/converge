# Task: 06-wire-screens/003-wire-per-screen/003-SettingsScreen-ElevatedButton-onPressed-1

Wire the **ElevatedButton** `onPressed` handler for `SettingsScreen-ElevatedButton-onPressed-1` in `lib/screens/settings/settings_screen.dart` (marker `// @converge:element SettingsScreen-ElevatedButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Sign out of the app

## Implementation

Wire to the appropriate action based on context:
- Navigation: `context.push('/route')`
- Provider mutation: `ref.read(provider.notifier).method()`
- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`
- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element SettingsScreen-ElevatedButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment