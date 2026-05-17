---
id: "002-frontend"
title: Create frontend app
depends_on:
  - 001-backend
outputs:
  - src/app.ts
checks:
  - id: app-exists
    cmd: test -f src/app.ts
    description: Frontend entry point exists
---

Create `src/app.ts` with a minimal frontend that fetches from the backend API at `http://localhost:3000` and renders the response.
