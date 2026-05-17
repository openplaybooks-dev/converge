---
title: "Mount Route — {{title}}"
description: Ensure the generated {{title}} screen is mounted in the router
blocking: true
skills:
  - react-implementing-routing
vars:
  screenId:
  title:
  route:
  componentName:
  screenPath:
inputs:
  - src/app/router.tsx
  - "{{screenPath}}"
outputs:
  - src/app/router.tsx
checks:
  - id: router-exists
    cmd: test -f src/app/router.tsx
    description: router exists
---
# Mount Route

Wire the `{{title}}` screen at `{{route}}` in `src/app/router.tsx`.

Keep the router readable and aligned with the site's actual information architecture.

