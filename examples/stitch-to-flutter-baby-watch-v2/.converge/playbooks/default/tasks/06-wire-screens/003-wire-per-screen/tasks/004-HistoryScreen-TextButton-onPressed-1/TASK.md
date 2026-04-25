---
id: 004-HistoryScreen-TextButton-onPressed-1
title: Wire TextButton.onPressed
checks:
  - id: handler-wired
    description: "TextButton.onPressed has real logic in lib/screens/history/history_screen.dart (@converge:element HistoryScreen-TextButton-onPressed-1)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/history/history_screen.dart --id HistoryScreen-TextButton-onPressed-1 onPressed
---

Wire the **TextButton** `onPressed` handler for `HistoryScreen-TextButton-onPressed-1` in `lib/screens/history/history_screen.dart` (marker `// @converge:element HistoryScreen-TextButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Clear all history

## Implementation

Wire to the appropriate action based on context:
- Navigation: `context.push('/route')`
- Provider mutation: `ref.read(provider.notifier).method()`
- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`
- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element HistoryScreen-TextButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
