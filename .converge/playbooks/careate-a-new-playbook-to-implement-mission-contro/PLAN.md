---
kind: container
children:
  - id: 00-cli-inventory
    kind: executable
    title: Inventory converge CLI commands
  - id: 01-prd
    kind: executable
    title: Mission control PRD
  - id: 02-architecture
    kind: executable
    title: Tech stack and architecture
  - id: 03-backend
    kind: container
    title: Backend API service
  - id: 04-frontend-shell
    kind: container
    title: Frontend shell, routing, and layout
  - id: 05-command-views
    kind: wbs
    title: Per-command UI views (fan-out)
---

# Goal

Build a "mission control" application for converge — a UI that lets users invoke every converge CLI command (plan, run, journal, playbook ops, etc.), monitor execution, and browse artifacts, with feature parity to the existing `converge` CLI.

# Decision

Container. The work splits into three phases — discovery (what is the CLI surface), design (what we are building and how), and implementation (backend + frontend + per-command views). Implementation cannot be one executable: backend, frontend shell, and per-command views are each substantial. The per-command surface is the canonical "N-of-the-same-shape" pattern, so it is one wbs driven by an upstream manifest rather than enumerated siblings. The manifest (`cli-commands.json`) is also the substrate for the PRD and the architecture decision, so it must be produced first.

# Children

## 00-cli-inventory — Inventory converge CLI commands
- **kind**: executable
- **goal**: Produce a structured manifest of every converge CLI command, its args, options, and one-line description, so downstream siblings can plan from data instead of guessing.
- **scope**: Walk `packages/cli/src/` (entry point `packages/cli/src/main.ts`) and extract each registered command. Emit `cli-commands.json` with name, args, options/flags (with type/default/description), short description, and example invocations.
- **inputs**:
  - `D:\converge\packages\cli\src\main.ts`
  - `D:\converge\packages\cli\src\`
- **outputs**:
  - `cli-commands.json`
- **checks**:
  - manifest-exists: `test -s cli-commands.json`
  - manifest-shape: `node -e "const r=require('./cli-commands.json'); if(!Array.isArray(r.commands)||r.commands.length<2) process.exit(1); for(const c of r.commands){if(!c.name||!c.description) process.exit(1)}"`
- **body**: |
    1. Read `packages/cli/src/main.ts` to discover how subcommands are registered (commander? yargs? custom?).
    2. Walk every referenced command module. For each top-level command extract: `name`, `args[]` (positional), `options[]` (each with `name`, optional `short`, `type`, `default`, `description`), `description`, optional `examples[]`.
    3. If a `--help` invocation is reachable in the workspace, cross-check the extracted set against the help output and reconcile discrepancies.
    4. Write `cli-commands.json` with shape `{ "commands": [ { "name": "...", "args": [...], "options": [...], "description": "...", "examples": [...] } ] }`.
    5. Sort `commands` alphabetically by `name` for stability across reruns.

## 01-prd — Mission control PRD
- **kind**: executable
- **goal**: Define what mission control is, who uses it, and the views that ship — anchored to the real CLI surface so "parity" is measurable.
- **scope**: Read `cli-commands.json`. Group commands into user journeys (planning, execution, monitoring, journal browsing, playbook management). Write `PRD.md` covering goals, non-goals, users, views, a command-coverage table, and acceptance criteria.
- **inputs**:
  - `cli-commands.json`
- **outputs**:
  - `PRD.md`
- **checks**:
  - prd-exists: `test -s PRD.md`
  - prd-sections: `grep -qE "^## Goals" PRD.md && grep -qE "^## Users" PRD.md && grep -qE "^## Views" PRD.md && grep -qE "^## Acceptance" PRD.md`
- **body**: |
    1. Load `cli-commands.json` and group commands by domain (e.g. `plan*` → planning, `run*` → execution, journal/log → monitoring).
    2. Draft `PRD.md` with sections: `## Goals`, `## Non-Goals`, `## Users`, `## Views` (top-level navigation areas), `## Command Coverage` (table mapping every entry of `cli-commands.json` to the view that exposes it — this table IS the parity contract), `## Acceptance` (deterministic checklist demonstrating parity).
    3. Be explicit that every entry in `cli-commands.json` MUST appear in the coverage table; no orphans.

## 02-architecture — Tech stack and architecture
- **kind**: executable
- **goal**: Decide and document the stack so downstream containers have unambiguous instructions: framework choices, package layout in the converge monorepo, how the backend invokes CLI, and how command output reaches the UI.
- **scope**: Read `PRD.md` and `cli-commands.json`. Decide and write `ARCHITECTURE.md` covering: where the new package lives (e.g. `packages/mission-control`), backend transport (HTTP+SSE / WebSocket / polling), CLI invocation strategy (spawn child process vs in-process import of `@converge/core`), frontend framework, project layout, dev tooling.
- **inputs**:
  - `PRD.md`
  - `cli-commands.json`
- **outputs**:
  - `ARCHITECTURE.md`
- **checks**:
  - arch-exists: `test -s ARCHITECTURE.md`
  - arch-sections: `grep -qE "^## Stack" ARCHITECTURE.md && grep -qE "^## Project Layout" ARCHITECTURE.md && grep -qE "^## Backend" ARCHITECTURE.md && grep -qE "^## Frontend" ARCHITECTURE.md && grep -qE "^## Streaming" ARCHITECTURE.md`
- **body**: |
    1. Read `PRD.md` to understand the views required.
    2. Read `cli-commands.json` to identify which commands are long-running (need streaming) vs one-shot (request/response).
    3. Make and document each decision: package location and name; language/runtime (TS); backend framework and how it invokes the CLI; frontend framework and bundler; transport for streaming output; routing convention (a route per command); how journals/artifacts on disk are surfaced; dev/build/test tooling.
    4. Write `ARCHITECTURE.md` with sections: `## Stack`, `## Project Layout`, `## Backend` (endpoint conventions, command-runner contract), `## Frontend` (shell + routing convention so per-command views slot in), `## Streaming` (transport choice + lifecycle), `## Open Decisions` for anything intentionally deferred to the implementing children.

## 03-backend — Backend API service
- **kind**: container
- **goal**: Implement the server that exposes every converge CLI command as an API endpoint with streaming output, plus read endpoints for journals, playbooks, and other on-disk artifacts mission control needs.
- **scope**: Per ARCHITECTURE.md, build the backend package. The recursive planner for this node will decide its child layer (server scaffold, generic command-runner, per-domain read endpoints, streaming transport, etc.) using `ARCHITECTURE.md` and `cli-commands.json` as authoritative inputs. Must publish an "endpoint registry" file (path TBD by its planner) so `05-command-views` knows which endpoint to call per command.
- **inputs**:
  - `ARCHITECTURE.md`
  - `cli-commands.json`

## 04-frontend-shell — Frontend shell, routing, and layout
- **kind**: container
- **goal**: Implement the frontend application skeleton — app shell, navigation, routing slots for every CLI command, shared UI primitives, and the API client to the backend.
- **scope**: Per ARCHITECTURE.md, build the frontend package. The recursive planner for this node will decide its child layer (project scaffold, layout/nav, router with placeholder routes for every command, API client, shared primitives). The router MUST register a route per `cli-commands.json[].name` so `05-command-views` can fill placeholder slots without re-touching navigation. Must publish a "route registry" (path TBD by its planner) so the wbs children know which slot to populate.
- **inputs**:
  - `ARCHITECTURE.md`
  - `cli-commands.json`

## 05-command-views — Per-command UI views (fan-out)
- **kind**: wbs
- **goal**: Implement one UI view per converge CLI command — form for args/options, invoke button, live output stream, result display.
- **scope**: Each templated child receives one command spec from `cli-commands.json` (name, args, options, description, examples). It produces the view component, fills the route slot registered by `04-frontend-shell`, and calls the endpoint published by `03-backend`. Children inherit `cli-commands.json` plus the route and endpoint registries via vars/inputs.
- **inputs**:
  - `cli-commands.json`
  - frontend route registry produced by `04-frontend-shell`
  - backend endpoint registry produced by `03-backend`
- **wbs**:
    type: nodejs
    driver: one child per entry in `cli-commands.json` `.commands[]`; the script reads the manifest with `fs`/`ctx.read` and packs `{ commandName, args: JSON.stringify(args), options: JSON.stringify(options), description, examples: JSON.stringify(examples) }` into each spawned child's vars (id = commandName).

# Open questions

- Tech stack target: web-only SPA against a local server, desktop app (Tauri/Electron), or both? Deferred to `02-architecture`, but a hint from the user would shrink the decision space.
- Workspace scope: does mission control manage exactly one converge workspace (the cwd) or list/switch between several? Affects PRD top-level nav.
- Auth: assumed local-only and unauthenticated for v1, or does it need auth for shared/remote deployments?
- Streaming semantics: must `plan`/`run` output be true streaming (SSE/WebSocket), or is short-poll acceptable for v1? Affects backend complexity.
- Destructive commands: does "all functions like converge CLI" include destructive/maintenance commands (clear journal, reset state) or only read + run? PRD should pin this down.
- Pre-existing prototype: per the planning rules I did not read siblings or descendants — flag if a prior mission-control package already exists that should be extended rather than green-fielded.
