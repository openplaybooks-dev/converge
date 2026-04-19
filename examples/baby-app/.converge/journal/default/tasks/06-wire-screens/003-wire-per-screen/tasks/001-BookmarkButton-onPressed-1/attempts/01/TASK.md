# Task: 06-wire-screens/003-wire-per-screen/001-BookmarkButton-onPressed-1

Wire the **IconButton** `onPressed` handler in `lib/screens/article_reader/article_reader_screen.dart:47`.

**Current status:** empty
**Required action:** Toggle bookmark state for current article

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