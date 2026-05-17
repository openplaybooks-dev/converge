---
id: 04-build-screens
title: Build Screens
description: Scaffold the React app and spawn a per-screen pipeline from the screen registry
blocking: true
depends_on:
  - 03-generate-assets
outputs:
  - package.json
  - src/app/router.tsx
  - src/theme/theme.css
  - src/screens/**/*.tsx
checks:
  - id: package-exists
    cmd: test -f package.json
    description: package.json exists
  - id: router-exists
    cmd: test -f src/app/router.tsx
    description: router exists
  - id: screens-exist
    cmd: "find src/screens -name '*.tsx' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'"
    description: at least one screen exists
---
# Build Screens

Prepare the Vite app scaffold, then fan out per route.

