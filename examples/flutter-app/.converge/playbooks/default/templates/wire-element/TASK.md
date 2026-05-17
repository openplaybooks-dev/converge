---
title: "Wire {{widget}}.{{elementType}}"
description: "Wire a single handler in a single Flutter file"
references:
  - flutter-implementing-navigation-and-routing
  - flutter-managing-state
  - flutter-building-forms
tags:
  - wire
  - element
vars:
  screenId:
  elementId:
  widget:
  elementType:
  file:
  status:
  action:
  target:
  body:
inputs:
  - "{{file}}"
outputs:
  - "{{file}}"
checks:
  - id: handler-wired
    cmd: "node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/seed/check-handler.mjs {{file}} --id {{elementId}} {{elementType}}"
    description: "{{widget}}.{{elementType}} has real logic in {{file}} (@converge:element {{elementId}})"
---

# Wire {{widget}}.{{elementType}}

{{body}}

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element {{elementId}}` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
