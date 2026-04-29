# Proposal: `apps/editor` — A New Web POC for Converge Playbooks

Status: **Draft proposal**
Owner: TBD
Branch: `claude/plan-editor-app-9XmnN`

---

## 1. Goal

Build a small, opinionated web app at `apps/editor` that lets a user:

1. **Author** a Converge playbook (`playbook.yml` + `tasks/*/TASK.md`) from the
   browser, without hand-editing YAML/Markdown.
2. **Manage** the task pipeline visually, switching between three views of the
   same DAG:
   - **Kanban** — group tasks by status (todo / running / blocked / done /
     failed). Best for "what's happening right now".
   - **Tree** — show the WBS / parent-child decomposition. Best for
     understanding scope.
   - **Gantt** — show task duration and dependency edges over time. Best for
     reviewing a finished or in-flight run.
3. **Watch progress live** while a playbook is running, by tailing the journal
   under `.converge/journal/{playbook}/`.

This is a **POC** — the point is to validate the UX of "edit + run + observe in
one place" against the actual `@converge/core` data model. It is **not** a
replacement for `packages/studio`.

## 2. Why a new app, not a feature in `studio`?

`packages/studio` is the production dashboard (OpenClaw Mission Control). It is
a large Next.js app with auth, MCP, Playwright, Docker, multi-provider
plumbing, and an OpenAPI contract that has to stay stable.

A POC needs to be cheap to throw away. Putting it in `studio` would:

- Force every experiment through the API-parity check
  (`scripts/check-api-contract-parity.mjs`).
- Pull in the full nav-rail, auth, and i18n surface.
- Make it tempting to ship half-finished UI behind a flag instead of deleting
  it.

Putting it in `apps/` (next to `apps/landing`) keeps it isolated, lets us pick
a different stack if it helps, and makes the "delete or promote" decision
explicit at the end of the POC.

**Tradeoff:** we duplicate some plumbing (playbook discovery, journal reader)
that already exists in `studio`. We accept that — `@converge/core` already
exposes both via `studio-api.ts`, so duplication is shallow.

## 3. Non-goals

- No auth, no multi-tenant, no remote execution. Local dev only.
- No replacement for the CLI. The editor *invokes* `converge run`; it does not
  reimplement the runner.
- No new task model. We bind directly to `TaskDefinition`, `PlaybookDef`, and
  `JournalEvent` from `@converge/core`.
- No mobile layout, no theming system, no plugin API.

If we find ourselves building any of the above, stop and reconsider scope.

## 4. Stack

Proposed (open to pushback):

- **Next.js 15 App Router** — same family as `studio`, easy to graduate code
  later. SSR not required; we can run as `output: "export"` if we want pure
  static + local API routes.
- **React 19** + **TanStack Query** for journal polling/streaming.
- **shadcn/ui + Tailwind v4** — matches `studio` so components can move across.
- **@xyflow/react** for the tree view (already a `studio` dependency).
- **dnd-kit** for the kanban.
- **A thin Gantt** rendered with SVG, not a library — see §6.3.

Server side: Next.js Route Handlers calling `@converge/core` directly
(`discoverPlaybooks`, `loadPlaybook`, `readEvents`, `SimpleLogTailer`). No
database. The filesystem under the user's project root *is* the database.

## 5. Data model — what we read and write

We bind to the existing core types, no new schemas:

| Concern              | Source                                                             |
| -------------------- | ------------------------------------------------------------------ |
| Playbook config      | `PlaybookDef` from `task/playbook/types.ts` (`playbook.yml`)       |
| Task definition      | `TaskDefinition` from `config/task-definition.ts` (`TASK.md` FM)   |
| Run progress         | `JournalEvent` stream from `.converge/journal/{playbook}/`         |
| Live tail            | `SimpleLogTailer` from `journal/simple-log-tailer.ts`              |
| Discovery            | `discoverPlaybooks`, `loadPlaybook` from `studio-api.ts`           |

Writes are limited to:

- `playbook.yml` (YAML round-trip via `yaml`)
- `tasks/{id}/TASK.md` (frontmatter via `gray-matter`, body preserved verbatim)

The editor never edits journal files.

## 6. UI surfaces

### 6.1 Kanban view

Columns: `pending`, `ready`, `running`, `blocked`, `done`, `failed`.

- Cards = tasks. Status derived from latest `TASK_*` / `LIFECYCLE_*` events in
  the journal.
- Drag-and-drop is **read-only for status** (status is the runner's truth). DnD
  is used to **reorder a task within `playbook.yml`'s `tasks:` list** or to
  **change `depends_on` by dropping onto another card** — both write back to
  YAML.
- Click → opens the task editor drawer (frontmatter form + Monaco for the body).

### 6.2 Tree view

- Renders the WBS: playbook → tasks → subtasks/yields.
- Powered by `@xyflow/react`, with `dagre` layout.
- Node color = status; edges = `depends_on` (solid) and parent/child (dashed).
- Inline rename of node label updates `TASK.md` frontmatter `title`.

### 6.3 Gantt view

- Time axis from journal `TIMELINE_BEGIN` / `TIMELINE_FINISH` events; falls
  back to `TASK_START` / `TASK_COMPLETE` when those aren't present.
- One row per task; bar from start→end, "live" tasks animate to `now`.
- Dependency arrows between bars derived from `depends_on`.
- Hand-rolled SVG keeps the dep on the diff small (~200 LOC) and avoids the
  feature creep that comes with full Gantt libraries.

All three views share one selection state and one task-editor drawer, so
clicking a task in any view opens the same form.

## 7. Backend surface (Route Handlers)

Minimal — every endpoint is one core call away.

```
GET  /api/playbooks                       → discoverPlaybooks(root)
GET  /api/playbooks/:name                 → loadPlaybook(...)
PUT  /api/playbooks/:name                 → write playbook.yml
GET  /api/playbooks/:name/tasks/:id       → read TASK.md
PUT  /api/playbooks/:name/tasks/:id       → write TASK.md (frontmatter only)
POST /api/playbooks/:name/tasks           → scaffold a new tasks/{id}/TASK.md
GET  /api/runs/:playbook/events           → SSE stream from SimpleLogTailer
POST /api/runs/:playbook                  → spawn `converge run <playbook>`
POST /api/runs/:playbook/stop             → SIGTERM the spawned child
```

No schema for runs is invented — it's the journal as-is, streamed.

## 8. Layout

```
apps/editor/
  package.json              # @converge/editor, private, type=module
  next.config.mjs           # output: "standalone", server actions off
  tsconfig.json             # extends ../../tsconfig.json
  tailwind.config.mjs
  src/
    app/
      layout.tsx
      page.tsx              # playbook picker
      [playbook]/
        page.tsx            # shell with view switcher
        kanban/page.tsx
        tree/page.tsx
        gantt/page.tsx
      api/                  # Route Handlers from §7
    components/
      task-drawer/          # form + Monaco body
      kanban/
      tree/
      gantt/
      view-switcher.tsx
    lib/
      core.ts               # thin wrappers around @converge/core
      journal-stream.ts     # SSE helper around SimpleLogTailer
      yaml-rw.ts            # safe YAML round-trip for playbook.yml
      task-md-rw.ts         # gray-matter round-trip for TASK.md
    store/
      selection.ts          # zustand: selected task id, view mode
```

No `pages/`, no `middleware.ts`, no i18n, no auth.

## 9. Milestones

Each milestone has a single, verifiable acceptance check. We do not move on
until the previous one passes.

1. **M0 — scaffold**
   `pnpm --filter @converge/editor dev` serves `localhost:3000` with an empty
   shell that lists discovered playbooks via `discoverPlaybooks`.
   *Verify:* opening the page on `examples/hello-world` shows that playbook.

2. **M1 — read-only kanban**
   Kanban shows tasks for the selected playbook with status from the journal.
   *Verify:* run `examples/hello-world` from the CLI; cards move columns as
   events arrive (poll every 1s; SSE in M4).

3. **M2 — task editor (read-only)**
   Click → drawer shows frontmatter + body from `TASK.md`.
   *Verify:* matches `cat tasks/{id}/TASK.md` byte-for-byte.

4. **M3 — task editor (write)**
   Edit frontmatter fields → `PUT` writes back, body preserved verbatim.
   *Verify:* edit `title`, save, diff shows only the title line changed; YAML
   key order preserved.

5. **M4 — live updates via SSE**
   Replace polling with `SimpleLogTailer`-backed SSE.
   *Verify:* kill `node` and reconnect cleanly; no duplicate events on
   reconnect (use offset cursor).

6. **M5 — tree view**
   `@xyflow/react` view of the WBS, sharing selection with kanban.
   *Verify:* selecting a node in tree opens the same drawer kanban does.

7. **M6 — gantt view**
   SVG Gantt from `TIMELINE_*` events, with dep arrows.
   *Verify:* a finished `examples/hello-world` run renders without overlap and
   with correct ordering.

8. **M7 — run controls**
   Buttons to start/stop the playbook via spawned `converge` child.
   *Verify:* start from UI, observe events stream, stop cleanly.

9. **M8 — POC review**
   Demo to ourselves. Decide: promote into `studio`, keep as separate app, or
   delete. Write a one-page retro that lives next to this proposal.

## 10. Risks and open questions

- **Drag-to-edit `depends_on` is risky.** It's easy to introduce cycles. M1
  ships kanban as drag-disabled for deps; we add it in a follow-up only if the
  validator can reject cycles inline.
- **Spawning `converge` from a Next route is fine for local dev** but assumes
  the CLI is on `PATH`. We should resolve it from `packages/cli` via the
  workspace, not `which converge`.
- **YAML round-trip is lossy by default.** We need `yaml`'s
  `Document`/`parseDocument` API, not `parse`/`stringify`, to preserve
  comments and key order. Worth a 30-min spike before M3.
- **Should the editor edit `TASK.md` body?** Frontmatter only is safer (the
  body is prose for the agent). Recommend frontmatter-only for the POC; expose
  the body as read-only Monaco.
- **Auth.** None. The app should refuse to start unless `NODE_ENV !==
  'production'` or `CONVERGE_EDITOR_ALLOW_PROD=1` is set. Cheap guardrail.

## 11. What "done" looks like for the POC

A reviewer can:

1. `pnpm --filter @converge/editor dev`
2. Pick `examples/hello-world` in the picker.
3. See kanban / tree / gantt of the playbook.
4. Edit a task's `title`, save, see the file change.
5. Click "Run", watch cards move in real time, see the gantt fill in.
6. Stop the run mid-way and see the partial state preserved.

If those six steps work, the POC has answered its question. Anything beyond
that is scope creep for a follow-up RFC.
