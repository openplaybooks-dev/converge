---
id: scaffold
title: Scaffold fullstack app components
seed:
  mode: cli
checks:
  - id: app-exists
    cmd: test -f src/app.ts
    description: Frontend entry point exists
  - id: server-exists
    cmd: test -f src/server.ts
    description: Backend entry point exists
---

Scaffold a fullstack TypeScript application by spawning the backend and frontend components.

Run these two commands (one per line). The cli-seed executor reads each line and applies it in-process:

```bash
converge spawn template --path .converge/playbooks/default/templates/backend/TASK.md --id 001-backend
converge spawn template --path .converge/playbooks/default/templates/frontend/TASK.md --id 002-frontend
```

The `frontend` template's own `depends_on: [001-backend]` enforces ordering. Do not modify the commands. Do not add or omit lines.

