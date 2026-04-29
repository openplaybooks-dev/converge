# @converge/editor

Browser-based playbook editor POC for Converge. Status: **M0 scaffold**.

See `docs/design/editor-app-proposal.md` at the repo root for scope and milestones.

## Run

```bash
pnpm install
pnpm --filter @converge/editor dev
# → http://127.0.0.1:3100
```

The page lists playbooks discovered from the nearest `.converge/playbooks/`
directory above `process.cwd()`. Override with `CONVERGE_ROOT=/path/to/project`.

## What's here (M0)

- Next.js 16 App Router shell, Tailwind v4, minimal shadcn-style primitives.
- `GET /api/playbooks` → discovers via `@converge/core/studio-api`.
- `/` → renders one card per playbook.

Nothing else is wired up. Subsequent milestones (kanban, tree, gantt, drawer,
SSE) live in the proposal doc.
