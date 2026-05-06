---
title: "Proposal: apps/editor — A New Web POC for Converge Playbooks"
description: "Draft proposal for a new web POC that visualizes and edits Converge playbooks."
---

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
   - **Tree** — show the Seed / parent-child decomposition. Best for
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

## 3. Out of scope

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
- **@xyflow/react + dagre** for the tree view (already a `studio` dependency).
- **@dnd-kit** (`core`, `sortable`, `utilities`) for the kanban.
- **react-hook-form + zod** for the task drawer form.
- **A thin Gantt** rendered with SVG, not a library — see §6.3.

Server side: Next.js Route Handlers calling `@converge/core` directly
(`discoverPlaybooks`, `loadPlaybook`, `readEvents`, `SimpleLogTailer`). No
database. The filesystem under the user's project root *is* the database.

### 4.1 Reference templates and what we borrow

We surveyed a few projects to avoid reinventing the shell.

| Project                       | License                                         | Verdict                       |
| ----------------------------- | ----------------------------------------------- | ----------------------------- |
| `multica-ai/multica`          | Modified Apache-2.0 (SaaS + branding clauses)   | **Reference only — do not fork** |
| `shadcn/ui` `next-template`   | MIT                                             | Use as scaffold base          |
| `shadcn/ui` examples/dashboard| MIT                                             | Borrow layout primitives      |
| `clauderic/dnd-kit` examples  | MIT                                             | Crib kanban DnD patterns      |
| `xyflow/xyflow`               | MIT                                             | Tree/DAG view                 |
| `frappe/gantt`                | MIT                                             | Fallback if SVG gets hairy    |

`multica-ai/multica` validates the stack we already proposed (Next.js + shadcn +
`@dnd-kit` + TanStack Query + zustand + TipTap), and its `apps/web` layout
(`app/`, `components/`, `features/`, `platform/`) is roughly what we want. But
its LICENSE is a *modified* Apache-2.0 with a SaaS-restriction clause and a
"retain frontend branding" clause — incompatible with converge's MIT and not a
clean SPDX. **We use multica as a stack reference, not a code source.** No
files are copied; patterns can be reimplemented from scratch with MIT
building blocks.

What multica does *not* solve for us:
- No `@xyflow/react` / DAG view — we still need to build the tree view.
- No Gantt — we still hand-roll SVG (or fall back to `frappe-gantt`).
- No form library — we add `react-hook-form` + `zod` for the task drawer.

### 4.2 Concrete scaffold path (M0)

Rather than starting from a blank `create-next-app`, M0 should:

1. `pnpm dlx shadcn@latest init` inside a fresh `apps/editor` Next.js 15 app
   (Tailwind v4, App Router, TS, no src dir reshuffle — keep `src/` per §8).
2. `pnpm dlx shadcn@latest add button card dialog drawer dropdown-menu input
   form select sheet tabs tooltip badge separator scroll-area sonner` — the
   minimum surface we need across all three views.
3. Add `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @xyflow/react dagre
   @tanstack/react-query react-hook-form zod yaml gray-matter zustand`.
4. Wire `@converge/core` and `@converge/project-root` as workspace deps.

That's the entire M0 scaffold. No code to write yet, just the right pieces in
the right places.

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

- Renders the Seed: playbook → tasks → subtasks/yields.
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
   Follow the steps in §4.2. `pnpm --filter @converge/editor dev` serves
   `localhost:3000` with an empty shell that lists discovered playbooks via
   `discoverPlaybooks`. shadcn primitives installed, Tailwind v4 working, no
   borrowed code from `multica` or any non-MIT source.
   *Verify:* opening the page on `examples/hello-world` shows that playbook;
   `pnpm --filter @converge/editor lint && tsc --noEmit` clean.

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
   `@xyflow/react` view of the Seed, sharing selection with kanban.
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

---

## 12. Pivot: Designer-First Mode (post-M0 update)

After M0 landed, the scope shifted from "viewer of an existing playbook" to
**"Jira-style designer for authoring playbooks"**. The runtime/observer views
(kanban, gantt-from-journal) become secondary; the primary surface is now a
graph editor where the user wires tasks together and lets AI fill gaps.

### 12.1 What changed

- **Kanban is deferred.** Kanban shows runtime status; the user wants design-time
  status. We keep kanban in the proposal as a future surface but stop blocking
  on it.
- **Tree / Gantt / Graph are *design* views**, not just observer views. They
  render the playbook structure regardless of whether it has ever run.
- **Two registries become first-class:** Tasks and Artifacts. Both are
  side panels that stay in sync with the canvas.
- **AI assist is part of the default flow.** "Draft from a one-liner",
  "fill this task's outputs", "suggest dependencies".

### 12.2 Data model the designer binds to

Confirmed in `packages/core/src/config/task-definition.ts`:

```ts
interface TaskDefinition {
  id: string;
  title?: string;
  description?: string;
  inputs?: string[];        // file globs — required input files
  outputs?: string[];       // file globs — expected output files
  depends_on?: string[];  // task ids or "tag:foo"
  blocking?: boolean;
  checks?: CheckEntry[];
  tags?: string[];
  // …prompt, agent, skill, seed, plan, executor — out of scope for M1
}
```

The editor derives a third object — **artifacts** — by union-ing every glob
across tasks:

```ts
interface EditorArtifact {
  glob: string;             // e.g. "src/feature-x.ts"
  producedBy: string[];     // task ids whose `outputs` include this glob
  consumedBy: string[];     // task ids whose `inputs`  include this glob
}
```

Artifacts are **derived, not stored**. There is no separate file for them.
Editing an artifact is shorthand for editing the `inputs` / `outputs` of every
task that references it.

### 12.3 Two kinds of edges

A directed graph between tasks has two edge sources:

| Edge          | Source                                                   | Visual    |
| ------------- | -------------------------------------------------------- | --------- |
| **Hard dep**  | Explicit `dependencies: [taskId]`                        | Solid     |
| **Data flow** | Output glob of A matches input glob of B (literal or globby match) | Dashed    |

The designer shows both. The user can **promote a dashed edge to solid** with
one click — the action writes a new entry to `depends_on:` in TASK.md. They
can also **demote** by removing the dep; the dashed edge stays if the data
flow is still implied.

This is the wiring loop the user asked for: "wire tasks to tasks, inputs to
outputs". We don't invent a new port system; we project the existing
`inputs`/`outputs`/`dependencies` fields as ports and edges.

### 12.4 UX shape (Jira-style three-pane)

```
┌──────────────────────────────────────────────────────────────────┐
│  Playbook ▾   [Tree | Graph | Gantt]      [⌘K  Ask AI]   [Save] │
├────────────┬────────────────────────────────────────┬────────────┤
│ Tasks      │                                        │ Inspector  │
│ • setup    │                                        │            │
│ • analyze  │           CANVAS                       │  (selected │
│ • build    │      (graph / tree / gantt)            │   task or  │
│ • verify   │                                        │  artifact) │
│ + new      │                                        │            │
├────────────┤                                        │            │
│ Artifacts  │                                        │            │
│ • src/**   │                                        │            │
│ • tests/** │                                        │            │
│ • spec.md  │                                        │            │
└────────────┴────────────────────────────────────────┴────────────┘
```

- **Left rail (top half):** task list, click → select on canvas, "+" creates
  a new TASK.md skeleton.
- **Left rail (bottom half):** artifact list, click → highlights the producing
  + consuming tasks on canvas.
- **Canvas:** view switcher between Graph / Tree / Gantt. Same selection
  state across all three.
- **Right inspector:** form for the selected entity. Saves write back to
  TASK.md frontmatter (preserving body) or playbook.yml.
- **Top bar:** Ask-AI command palette (⌘K) plus a Save button that batches
  writes.

### 12.5 AI assist — three concrete levers

We don't open-end this. Three buttons, no more:

1. **"Draft a playbook"** — empty-state action. Prompt: a one-liner ("ship a
   web scraper for X"). Output: a full playbook YAML + N TASK.md files
   written under `.converge/playbooks/<slug>/`.
2. **"Fill this task"** — per-task action in the inspector. Given the task's
   title/description, asks AI to suggest `inputs`, `outputs`, and `checks`.
   User accepts/rejects field-by-field; nothing auto-saves.
3. **"Suggest dependencies"** — global action. Given the current set of
   tasks, asks AI which tasks should depend on which based on their
   inputs/outputs. Returns a diff of `dependencies:` to add/remove.

All three call **one server endpoint** `POST /api/ai/draft` with a
discriminator (`{kind: "playbook" | "task" | "deps", ...}`). The endpoint
delegates to `@converge/agentfn` (or whatever provider is configured via
`CONVERGE_AI_PROVIDER`); no new SDK is added to the editor.

### 12.6 Revised milestones (supersedes §9 from M1 onward)

M0 is unchanged. From M1 onward:

- **M1 — Designer skeleton (read-only).** Three-pane layout, graph view via
  `@xyflow/react`, tasks panel, artifacts panel. Loads a playbook from disk;
  renders nodes with input/output ports and dependency edges. No editing.
- **M2 — Inspector form (read-only).** Click → drawer shows TASK.md
  frontmatter + body. Form is rendered but disabled.
- **M3 — Save path.** Form becomes editable; Save writes TASK.md frontmatter
  back via `gray-matter` + YAML round-trip (preserves body byte-for-byte).
- **M4 — Wiring.** Drag from a task's output port to another task's input
  port → adds the task id to `dependencies:`. Cycle check inline.
- **M5 — Tree view.** Seed tree with the same selection model.
- **M6 — AI: draft a playbook** (lever #1 from §12.5).
- **M7 — AI: fill this task** (lever #2).
- **M8 — Gantt view** (replays journal; only useful after a run).
- **M9 — AI: suggest dependencies** (lever #3).
- **M10 — POC review.** Same decision as before: promote, keep, or delete.

Kanban (old M1) is moved to "future" and may never ship in this app.

### 12.7 Open questions added by the pivot

- **Globs as ports.** `inputs: ['src/**/*.ts']` is a glob, not a single file —
  is the "port" the glob string, or each matched file? **Decision:** the port
  is the glob string. Two globs match if they're string-equal *or* one is a
  prefix the other globs into; a tighter semantic match is out of scope.
- **AI provider config.** The editor inherits `@converge/agentfn`'s
  resolution rules (env vars, project-level config). No editor-specific
  config UI in the POC.
- **Cycles.** The wiring step (M4) must reject cycles. We compute a topo
  sort on every save; if it fails, we surface the cycle in the inspector and
  refuse to write.
- **YAML formatting fidelity.** ~~Follow-up M3.5~~ **Resolved.** Saves
  now go through `yaml.parseDocument` and mutate the document in place
  (`src/lib/frontmatter.ts`); only keys the user touched re-emit, the
  rest are preserved byte-for-byte (quoting, comments, key order,
  blank-line-before-body). Verified on `landing-page/01-prepare-spec`:
  changing `title` + adding one input + adding `tags` produces a 5-line
  diff; the unrelated `outputs:`, `blocking:`, and body are untouched.
  Reads still go through `gray-matter` (only the write path needed
  swapping).
- **Where does "draft a playbook" write?** `.converge/playbooks/<slug>/` in
  the resolved project root. Refuses to overwrite an existing playbook
  unless the user confirms.

---

## 13. Correction: Design and Run Are One Surface

The previous pivot still split the world into a **designer** (graph, tree)
and an **operational viewer** (kanban, gantt-from-journal). That framing is
wrong. A playbook is a single living artifact — you design it, plan it,
tweak it, run it, and edit it *while it's running*. The editor should
reflect that, not separate it.

### 13.1 The unified model

There is one underlying object: the **playbook**. It has two coupled but
independent state streams:

| Stream    | Source on disk                              | Owner    |
| --------- | ------------------------------------------- | -------- |
| **Design**| `playbook.yml` + `tasks/**/TASK.md`         | Editor   |
| **Run**   | `.converge/journal/<epicId>/...`            | Runner   |

The editor reads from both, writes only to design. The runner reads from
design, writes only to run state. Conflict resolution is already the
runner's job (checkpoint reconcile in `core/checkpoint/reconcile.ts`), so
edits during a run are safe by construction — the runner picks them up on
its next reconcile.

### 13.2 Views are lenses, not modes

Graph, Tree, Gantt, and Kanban are **lenses** over the same task list.
There is no "design mode" or "run mode" — every lens shows design fields
*and* runtime status simultaneously:

- **Graph (default).** Nodes show inputs/outputs; the node border, dot,
  and (eventually) a pulsing animation reflect runtime status. Dependency
  edges and data-flow edges are unchanged from §12.
- **Tree.** Seed hierarchy, runtime status as a colored chip per node.
- **Gantt.** Time-based, fed by `TASK_START` / `TASK_COMPLETE` journal
  events. Tasks not yet run render as ghosted bars sized by an estimate
  or by the last successful run's duration.
- **Kanban.** `groupBy(status)`. Same cards as the tasks panel; the column
  is the lens. Dragging a card here doesn't change status (status is the
  runner's truth) but selects the task on the canvas.
- **List.** Linear; secondary, mostly for keyboard-driven reordering.

Kanban is no longer "deferred". It's just one of five lenses, each cheap
because they all bind to the same data.

### 13.3 Edits during a run

The editor never needs to "lock" while the runner is active. Three rules:

1. Saves write the same atomic `tmp + rename` we already do (M3). The
   runner re-reads `TASK.md` on its own schedule, so the edit shows up
   on the next cycle.
2. The inspector shows a small chip per task — `running`, `complete`,
   `failed`, etc. — read from the journal at request time and refreshed
   over SSE.
3. If the user tries to delete a dep that the runner is currently
   following (rare, but possible), the runner's reconcile will skip the
   missing dep on its next cycle. We do **not** add a confirmation dialog
   for this; the runner already handles it.

### 13.4 Live status — minimum and follow-up

**Minimum (M5a, this slice).** On every page load, the server reads
`status.json` for each declared task via `readTaskStatus()`. Nodes show
the current status as a colored border + a small label. No live updates
yet — refresh the page to see new state.

**Follow-up (M5b).** SSE endpoint `GET /api/runs/<playbook>/events` that
streams via `SimpleLogTailer`. The client merges incremental updates into
the same status map without refetching the whole detail.

**Follow-up (M7).** Inline run controls: a "Run" button in the header
that spawns `converge run <name>` as a child process; a "Stop" button
that signals it. Out of scope until M5b is solid.

### 13.5 Revised milestone sequence (supersedes §12.6 from M5 on)

- **M5a — Status overlay (one-shot).** Per-task status read at page
  load; coloring on graph nodes and the tasks panel.
- **M5b — Live tail.** SSE feed; client merges status updates without
  reload.
- **M3.5 — YAML fidelity.** *(Done.)* Switched `gray-matter` for `yaml.parseDocument`
  so saves stop reformatting unrelated frontmatter. Independent of M5;
  schedule in parallel.
- **M6 — AI: "Draft a playbook"** (lever #1 from §12.5). Unchanged.
- **M7 — Inline run controls** (Start / Stop). Unchanged in scope, but
  now cleanly composable with M5 because the lens shows the run live.
- **M8 — Tree view, Gantt view, Kanban view.** All three become small
  follow-ups; each is a few hundred lines because all the data is
  already on the client.
- **M9 — AI: "Fill this task" / "Suggest dependencies"** (levers #2 + #3).
- **M10 — POC review.** Same decision: promote, keep, or delete.

The previous "kanban deferred indefinitely" call is **rescinded**.

