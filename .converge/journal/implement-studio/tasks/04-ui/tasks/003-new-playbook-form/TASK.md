---
id: 003-new-playbook-form
title: New-playbook form page
dependencies:
  - 001-prune-mc-pages
outputs:
  - packages/converge-studio/src/app/playbooks/new/page.tsx
checks:
  - id: page-exists
    description: New-playbook page exists
    cmd: "test -f 'packages/converge-studio/src/app/playbooks/new/page.tsx'"
  - id: typecheck
    description: Page typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Build a form page that creates a new playbook by posting `NewPlaybookSpec` JSON to `POST /api/playbooks`.

**Form fields**:

- **name** (required) — text, validated `^[a-z0-9][a-z0-9-]*$`. Show inline error and reject if directory already exists.
- **description** (required) — textarea.
- **inputs** (optional, repeatable) — list of `{ key, description, required }` rows.
- **run config**:
  - **mode** — select: `oneoff` (default), `dispatch`, `converge`, `loop`.
  - **maxTaskAttempts** — number input, default `3`.
  - **maxDuration** — text input with helper ("e.g. `2h`, `30m`"), default `2h`.
  - **resume** — checkbox, default `true`.
  - **stall.maxConsecutive** — number, optional.
  - **stall.backoffMs** — number, optional.
- **checks** (optional, repeatable) — list of `{ id, cmd, description }` rows. (MVP: free-text; advanced editor later.)

**Submit flow**:

1. Build `NewPlaybookSpec` from form state.
2. `POST /api/playbooks` with JSON body.
3. On 201 → redirect to `/playbooks/<name>`.
4. On 4xx → render the API's error message inline.

**Reuse**: Mission Control's form primitives (input/select/textarea/checkbox), validation patterns. Use `react-hook-form` + `zod` if the upstream already pulls it in; otherwise plain controlled state is fine for MVP.
