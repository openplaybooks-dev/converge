---
id: scaffold
title: Scaffold fullstack app components
wbs:
  type: nodejs
  path: ./wbs.js
checks:
  - id: app-exists
    cmd: test -f src/app.ts
    description: Frontend entry point exists
  - id: server-exists
    cmd: test -f src/server.ts
    description: Backend entry point exists
---

Scaffold a fullstack TypeScript application with frontend and backend components.
