---
id: "001-backend"
title: Create backend server
outputs:
  - src/server.ts
checks:
  - id: server-exists
    cmd: test -f src/server.ts
    description: Backend entry point exists
---

Create `src/server.ts` with a minimal HTTP server that listens on port 3000 and responds with `{ "status": "ok" }`.
