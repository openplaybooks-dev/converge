---
title: Tech stack and architecture
outputs:
  - ARCHITECTURE.md
checks:
  - id: arch-exists
    cmd: test -s ARCHITECTURE.md
    description: ARCHITECTURE.md exists and is non-empty
  - id: arch-sections
    cmd: grep -qE "^## Stack" ARCHITECTURE.md && grep -qE "^## Project Layout" ARCHITECTURE.md && grep -qE "^## Backend" ARCHITECTURE.md && grep -qE "^## Frontend" ARCHITECTURE.md && grep -qE "^## Streaming" ARCHITECTURE.md
    description: ARCHITECTURE.md contains the five required top-level sections
---

# Tech stack and architecture

**Goal**: Decide and document the stack so downstream containers have unambiguous instructions: framework choices, package layout in the converge monorepo, how the backend invokes CLI, and how command output reaches the UI.

## Scope

Read `PRD.md` and `cli-commands.json` (both produced by upstream siblings `01-prd` and `00-cli-inventory` respectively, available in the parent node directory). Decide and write `ARCHITECTURE.md` covering:

- Where the new package lives (e.g. `packages/mission-control`).
- Backend transport (HTTP+SSE / WebSocket / polling).
- CLI invocation strategy (spawn child process vs in-process import of `@converge/core`).
- Frontend framework.
- Project layout.
- Dev tooling.

**Inputs**:
- `PRD.md` (sibling output from `01-prd`)
- `cli-commands.json` (sibling output from `00-cli-inventory`)

**Outputs**:
- `ARCHITECTURE.md`

Downstream consumers of this document:
- `03-backend` (container) — needs the backend framework, endpoint conventions, command-runner contract, and streaming transport pinned down.
- `04-frontend-shell` (container) — needs the frontend framework, routing convention, and API client shape pinned down.
- `05-command-views` (wbs) — relies on the route + endpoint conventions established here.

## Instructions

1. **Locate sibling outputs.** Both `PRD.md` and `cli-commands.json` should be present in the parent node directory (one level up from this child's working directory). Use **Read** to load them. If either is missing, stop and report — this child cannot make decisions without them.

2. **Read `PRD.md`** to understand the views required and the user journeys (planning, execution, monitoring, journal browsing, playbook management). Note the top-level navigation areas and the command-coverage table — these drive the routing convention.

3. **Read `cli-commands.json`** to identify which commands are long-running (need streaming output — typically `plan`, `run`) vs one-shot (request/response — typically read/list/inspect commands). Tally roughly how many commands fall in each bucket; this informs the transport decision.

4. **Inspect the existing converge monorepo layout** to ground the package-location decision. Use **Glob** for `packages/*/package.json` and **Read** the root `package.json` and any workspace config (e.g. `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`) to understand:
   - Workspace tool (npm/yarn/pnpm workspaces, turbo, nx).
   - TypeScript baseline (strict? path aliases?).
   - How existing packages are named and exported (`@converge/core`, `@converge/cli`, etc.).
   - Whether `@converge/core` exports a programmatic API the backend could import in-process.

5. **Make and document each of the following decisions explicitly.** For each, state the choice and a one-sentence rationale tied to the inputs:
   - **Package location and name** — e.g. `packages/mission-control` (single package) vs `packages/mission-control-server` + `packages/mission-control-web` (split). Decide based on workspace conventions observed in step 4.
   - **Language/runtime** — TypeScript on Node.js, matching the rest of the monorepo.
   - **Backend framework** — pick one (e.g. Fastify, Express, Hono) and justify briefly.
   - **CLI invocation strategy** — `spawn`/`execa` a `converge` child process per request, vs in-process import of `@converge/core`. Note the tradeoff (process isolation + true CLI parity vs lower latency + structured access).
   - **Frontend framework and bundler** — pick one (e.g. React + Vite, SvelteKit, SolidStart) and justify briefly.
   - **Streaming transport** — HTTP + Server-Sent Events, WebSockets, or short polling. Justify against the long-running command count from step 3.
   - **Routing convention** — explicit rule like "one route per `cli-commands.json[].name`, route path = `/commands/<name>`". This is the contract `04-frontend-shell` and `05-command-views` will follow.
   - **On-disk artifact surfacing** — how journals, playbooks, and other workspace files (e.g. `.converge/journal/`, `.converge/playbooks/`) are exposed as read endpoints.
   - **Dev/build/test tooling** — dev server commands, build pipeline, test runner. Match monorepo conventions where possible.

6. **Write `ARCHITECTURE.md`** using **Write**. It must contain at least these top-level sections in this exact spelling (the checks grep for them):
   - `## Stack` — the headline framework choices (backend framework, frontend framework, language, transport).
   - `## Project Layout` — directory tree of the new package(s) under `packages/`, with one-line annotation per directory.
   - `## Backend` — endpoint conventions (URL shape, request/response format), the command-runner contract (input: command spec from `cli-commands.json` + user-supplied arg/option values; output: streamed events + final exit code), and the artifact-read endpoints.
   - `## Frontend` — app shell + routing convention so per-command views slot in. State the route registry contract that `04-frontend-shell` will publish.
   - `## Streaming` — transport choice, event shape (e.g. `{ type: "stdout" | "stderr" | "exit", data: ... }`), connection lifecycle, error/reconnect behavior.
   - `## Open Decisions` — anything intentionally deferred to the implementing children (e.g. exact endpoint paths, exact event names) so its absence here is not a gap to fix but a delegation.

7. **Cross-check before finishing.** Re-read `ARCHITECTURE.md` and verify:
   - Every decision listed in step 5 is addressed somewhere.
   - The five required section headings (`## Stack`, `## Project Layout`, `## Backend`, `## Frontend`, `## Streaming`) appear at top level (not nested).
   - The routing rule is concrete enough that a downstream agent could enumerate every route from `cli-commands.json` without further input.
   - The command-runner contract is concrete enough that `03-backend` can implement it without re-deciding the transport or the input schema.

8. **Run the checks locally** to confirm:
   - `test -s ARCHITECTURE.md`
   - `grep -qE "^## Stack" ARCHITECTURE.md && grep -qE "^## Project Layout" ARCHITECTURE.md && grep -qE "^## Backend" ARCHITECTURE.md && grep -qE "^## Frontend" ARCHITECTURE.md && grep -qE "^## Streaming" ARCHITECTURE.md`

   Both must exit 0.
