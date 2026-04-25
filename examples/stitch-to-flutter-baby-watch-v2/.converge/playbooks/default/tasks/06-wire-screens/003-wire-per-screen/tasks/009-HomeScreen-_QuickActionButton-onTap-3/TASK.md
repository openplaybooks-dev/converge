---
id: 009-HomeScreen-_QuickActionButton-onTap-3
title: Wire _QuickActionButton.onTap
checks:
  - id: handler-wired
    description: "_QuickActionButton.onTap has real logic in lib/screens/home/home_screen.dart (@converge:element HomeScreen-_QuickActionButton-onTap-3)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/home/home_screen.dart --id HomeScreen-_QuickActionButton-onTap-3 onTap
---

Wire the **_QuickActionButton** `onTap` handler for `HomeScreen-_QuickActionButton-onTap-3` in `lib/screens/home/home_screen.dart` (marker `// @converge:element HomeScreen-_QuickActionButton-onTap-3` must stay).

**Current status:** empty
**Required action:** Pause notifications for 15 minutes


## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element HomeScreen-_QuickActionButton-onTap-3` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
