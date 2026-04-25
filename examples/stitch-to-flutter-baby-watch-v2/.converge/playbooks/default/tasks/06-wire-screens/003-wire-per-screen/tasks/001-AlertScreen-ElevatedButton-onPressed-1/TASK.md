---
id: 001-AlertScreen-ElevatedButton-onPressed-1
title: Wire ElevatedButton.onPressed
checks:
  - id: handler-wired
    description: "ElevatedButton.onPressed has real logic in lib/screens/alert/alert_screen.dart (@converge:element AlertScreen-ElevatedButton-onPressed-1)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/alert/alert_screen.dart --id AlertScreen-ElevatedButton-onPressed-1 onPressed
---

Wire the **ElevatedButton** `onPressed` handler for `AlertScreen-ElevatedButton-onPressed-1` in `lib/screens/alert/alert_screen.dart` (marker `// @converge:element AlertScreen-ElevatedButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Acknowledge alert — I have checked on the child

## Implementation

Wire to the appropriate action based on context:
- Navigation: `context.push('/route')`
- Provider mutation: `ref.read(provider.notifier).method()`
- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`
- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element AlertScreen-ElevatedButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
