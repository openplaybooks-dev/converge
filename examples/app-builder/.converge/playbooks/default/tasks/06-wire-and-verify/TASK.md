---
id: 06-wire-and-verify
title: Wire And Verify
description: Mount routes, connect interactions, add tests, and verify the generated React app end to end
blocking: true
depends_on:
  - 05-add-behavior
outputs:
  - src/app/router.tsx
  - src/**/*.test.tsx
checks:
  - id: generated-app-verifies
    cmd: node .converge/playbooks/default/tasks/06-wire-and-verify/003-verify/verify-generated-app.mjs
    description: generated app passes structural verification
---
# Wire And Verify

Close the gap between a generated UI and a buildable app:

1. mount routes and shell chrome
2. connect state and interactions
3. add tests and verify the result

