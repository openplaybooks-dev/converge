---
id: 006-HomeScreen-TextButton-onPressed-1
title: Wire TextButton.onPressed
checks:
  - id: handler-wired
    description: "TextButton.onPressed has real logic in lib/screens/home/home_screen.dart (@converge:element HomeScreen-TextButton-onPressed-1)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/home/home_screen.dart --id HomeScreen-TextButton-onPressed-1 onPressed
---

Wire the **TextButton** `onPressed` handler for `HomeScreen-TextButton-onPressed-1` in `lib/screens/home/home_screen.dart` (marker `// @converge:element HomeScreen-TextButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Navigate to beacon detail screen
**Target:** /beacon/:id

## Implementation

```dart
onPressed: () => context.push('/beacon/:id'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element HomeScreen-TextButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
