---
id: 001-ModeSelectorPill-onTap-1
title: Wire ModeSelectorPill.onTap
checks:
  - id: handler-wired
    description: "ModeSelectorPill.onTap has real logic at lib/screens/home/home_screen.dart:69"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/home/home_screen.dart 69 onTap
---

Wire the **ModeSelectorPill** `onTap` handler in `lib/screens/home/home_screen.dart:69`.

**Current status:** empty
**Required action:** Open mode selection bottom sheet


## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
