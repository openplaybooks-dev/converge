---
id: 001-ExportData-onTap-1
title: Wire InkWell.onTap
checks:
  - id: handler-wired
    description: "InkWell.onTap has real logic at lib/screens/settings/widgets/data_section.dart:44"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/settings/widgets/data_section.dart 44 onTap
---

Wire the **InkWell** `onTap` handler in `lib/screens/settings/widgets/data_section.dart:44`.

**Current status:** empty
**Required action:** Export all user data


## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
