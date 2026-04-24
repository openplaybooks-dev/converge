---
id: 003-InviteAcceptScreen-OutlinedButton-onPressed-1
title: Wire OutlinedButton.onPressed
checks:
  - id: handler-wired
    description: "OutlinedButton.onPressed has real logic in lib/screens/invite_accept/invite_accept_screen.dart (@converge:element InviteAcceptScreen-OutlinedButton-onPressed-1)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/invite_accept/invite_accept_screen.dart --id InviteAcceptScreen-OutlinedButton-onPressed-1 onPressed
---

Wire the **OutlinedButton** `onPressed` handler for `InviteAcceptScreen-OutlinedButton-onPressed-1` in `lib/screens/invite_accept/invite_accept_screen.dart` (marker `// @converge:element InviteAcceptScreen-OutlinedButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Reject invitation

## Implementation

Wire to the appropriate action based on context:
- Navigation: `context.push('/route')`
- Provider mutation: `ref.read(provider.notifier).method()`
- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`
- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element InviteAcceptScreen-OutlinedButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
