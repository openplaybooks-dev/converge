---
kind: container
children:
  - id: 00-scaffold
    kind: executable
    title: Scaffold frontend package
  - id: 01-api-client
    kind: executable
    title: API client module
  - id: 02-shared-ui
    kind: executable
    title: Shared UI primitives
  - id: 03-app-shell
    kind: executable
    title: App shell and navigation
  - id: 04-router-registry
    kind: executable
    title: Router and route registry
---

# Goal

Build the frontend application skeleton for mission control: an installable package with the framework chosen in `ARCHITECTURE.md`, a layout/navigation shell, an API client, shared UI primitives, and a router that registers one placeholder route per converge CLI command. Publish a `route-registry.json` so the downstream `05-command-views` wbs can fill each placeholder slot without re-touching navigation.

# Decision

Container with 5 executable children, each owning one focused slice of the frontend skeleton. The shell does not implement per-command views (that is `05-command-views`'s job) — it only stubs the slots and registers them. The placeholder views are mechanical boilerplate generated from `cli-commands.json` in a single loop, not LLM-creative work, so a `wbs` is not warranted; one executable suffices. Children chain by file: scaffold lays down the package dir, then api-client / shared-ui / app-shell / router-registry build into it. The frontend package path is assumed to be `packages/mission-control-frontend/` per the convention `02-architecture` will likely adopt; if `ARCHITECTURE.md` chose differently, `00-scaffold` is responsible for honoring its decision and the convention check below will fail-loud.

# Children

## 00-scaffold — Scaffold frontend package
- **kind**: executable
- **goal**: Create the frontend package directory with build/runtime config and an entry point that boots an empty app, per `ARCHITECTURE.md`.
- **scope**: Read `ARCHITECTURE.md` to identify the package location, framework, and bundler. Create the package dir with `package.json` (name, scripts: `dev`, `build`, `typecheck`), `tsconfig.json`, bundler config (e.g. `vite.config.ts`), an `index.html` entry, and a minimal `src/main.tsx` (or framework equivalent) that mounts an empty `<App />`. Do NOT install dependencies or run the dev server here — declarative setup only. Add the package to the workspace's package manager config if the monorepo requires it.
- **inputs**:
  - `ARCHITECTURE.md`
- **outputs**:
  - `packages/mission-control-frontend/package.json`
  - `packages/mission-control-frontend/tsconfig.json`
  - `packages/mission-control-frontend/index.html`
  - `packages/mission-control-frontend/src/main.tsx`
  - `packages/mission-control-frontend/src/App.tsx`
- **checks**:
  - package-json: `test -s packages/mission-control-frontend/package.json`
  - package-json-shape: `node -e "const p=require('./packages/mission-control-frontend/package.json'); if(!p.name||!p.scripts||!p.scripts.dev||!p.scripts.build) process.exit(1)"`
  - entry-exists: `test -s packages/mission-control-frontend/src/main.tsx && test -s packages/mission-control-frontend/index.html`
- **body**: |
    1. Read `ARCHITECTURE.md`. Locate the `## Stack`, `## Project Layout`, and `## Frontend` sections to extract: package path (default `packages/mission-control-frontend`), framework (e.g. React/Solid/Vue), bundler (e.g. Vite), language (TS).
    2. Create the package directory at the resolved path. If it differs from `packages/mission-control-frontend`, update the check paths in this PLAN's open questions log — but still write to the path `ARCHITECTURE.md` mandates.
    3. Write `package.json` with name (e.g. `@converge/mission-control-frontend`), `type: "module"`, scripts `dev`/`build`/`typecheck`, and dev/runtime deps for the chosen framework + bundler. Mark `private: true`.
    4. Write `tsconfig.json` extending the workspace base if one exists; otherwise a strict TS config compatible with the chosen framework.
    5. Write `vite.config.ts` (or equivalent) wiring the framework plugin. Set the dev server port deterministically (e.g. 5173) and configure a proxy to the backend dev port from `ARCHITECTURE.md` so the API client can use relative URLs.
    6. Write `index.html` with a `<div id="root">` and a script tag pointing at `src/main.tsx`.
    7. Write `src/main.tsx` to mount `<App />` from `./App`. Write `src/App.tsx` as a placeholder that renders a single heading "Mission Control" — it will be replaced by `03-app-shell`.
    8. If the workspace uses pnpm/yarn workspaces or npm workspaces, append the new package to the relevant root config so `dev`/`build` from the root works.

## 01-api-client — API client module
- **kind**: executable
- **goal**: Provide a typed client that the per-command views and the shell can use to call the backend, including streaming command output.
- **scope**: Build `src/api/client.ts` with a generic `runCommand(name, args, options, { onChunk })` that opens the streaming transport `ARCHITECTURE.md` chose (SSE / WebSocket / polling) plus typed read helpers (`listJournals`, `listPlaybooks`, etc., as a thin pass-through `get(path)`). The client must be agnostic to specific commands — per-command logic lives in `05-command-views`. Export TS types for the request/response shapes shared with the backend.
- **inputs**:
  - `ARCHITECTURE.md`
  - `packages/mission-control-frontend/package.json`
- **outputs**:
  - `packages/mission-control-frontend/src/api/client.ts`
  - `packages/mission-control-frontend/src/api/types.ts`
- **checks**:
  - client-exists: `test -s packages/mission-control-frontend/src/api/client.ts`
  - client-exports: `grep -qE "export +(async +)?function +runCommand" packages/mission-control-frontend/src/api/client.ts`
  - stream-handler: `grep -qE "onChunk|EventSource|WebSocket|ReadableStream" packages/mission-control-frontend/src/api/client.ts`
  - types-exists: `test -s packages/mission-control-frontend/src/api/types.ts`
- **body**: |
    1. Read the `## Streaming` and `## Backend` sections of `ARCHITECTURE.md` to identify the transport (SSE / WebSocket / chunked HTTP / polling) and the endpoint convention (e.g. `POST /api/commands/:name`).
    2. Write `src/api/types.ts` with `RunCommandRequest`, `RunCommandResponse`, `CommandChunk` (stdout/stderr line + timestamp + stream tag), and a `Result<T>` discriminated union for read endpoints. Keep these aligned with what `03-backend` exposes — if `ARCHITECTURE.md` is silent on a field, document the assumption in a TS comment.
    3. Write `src/api/client.ts` exporting:
       - `runCommand(name, args, options, callbacks)` that POSTs to the run endpoint, opens the streaming transport, calls `onChunk(chunk)` for each emitted line, and resolves with the final `RunCommandResponse` (exit code, duration, etc.).
       - `get<T>(path)` and `post<T>(path, body)` thin typed wrappers around `fetch` for read endpoints.
       - A single `baseUrl` resolver that uses `import.meta.env.VITE_MISSION_CONTROL_API` with a sensible default (relative `/api`, since the dev proxy in `00-scaffold` forwards it).
    4. Do NOT import `cli-commands.json` here — the client is generic; per-command callers pass `name` themselves.
    5. Wire `AbortController` so callers can cancel a running command.

## 02-shared-ui — Shared UI primitives
- **kind**: executable
- **goal**: Provide the reusable UI building blocks every per-command view will compose, so `05-command-views` does not reinvent them N times.
- **scope**: Build a small set of presentational primitives in `src/ui/`: `Button`, `TextInput`, `Checkbox`, `Select`, `FormField` (label + control + description + error), `OutputPanel` (renders a streaming log with stdout/stderr coloring and auto-scroll), `Card`, `Spinner`. Export them via `src/ui/index.ts`. Style with whatever `ARCHITECTURE.md` chose (CSS modules / Tailwind / vanilla). Keep them dumb — no API calls, no router knowledge, just props in / DOM out.
- **inputs**:
  - `ARCHITECTURE.md`
  - `packages/mission-control-frontend/package.json`
- **outputs**:
  - `packages/mission-control-frontend/src/ui/index.ts`
  - `packages/mission-control-frontend/src/ui/`
- **checks**:
  - barrel-exists: `test -s packages/mission-control-frontend/src/ui/index.ts`
  - primitive-count: `find packages/mission-control-frontend/src/ui -maxdepth 1 -name '*.tsx' | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=6?0:1)"`
  - output-panel: `grep -qE "OutputPanel" packages/mission-control-frontend/src/ui/index.ts`
- **body**: |
    1. Read `## Frontend` in `ARCHITECTURE.md` to confirm the styling approach and any UI library choice. If a UI kit (e.g. Radix, shadcn) was selected, prefer wrapping it; otherwise hand-roll minimal components.
    2. Write each primitive as `src/ui/<Name>.tsx`. Each accepts standard prop shapes (`Button` → `onClick`, `disabled`, `variant`; `FormField` → `label`, `description`, `error`, `children`; `OutputPanel` → `chunks: CommandChunk[]`, `running: boolean`).
    3. `OutputPanel` MUST color-distinguish stdout vs stderr and pin scroll to the bottom while new chunks arrive (release pin if the user scrolls up).
    4. Write `src/ui/index.ts` re-exporting all primitives so consumers do `import { Button, OutputPanel } from '../ui'`.
    5. Do NOT couple primitives to the router or to `cli-commands.json`. They are visual lego only.

## 03-app-shell — App shell and navigation
- **kind**: executable
- **goal**: Replace the placeholder `App.tsx` with the real chrome — a layout that hosts the router outlet plus a navigation sidebar grouping every CLI command by domain.
- **scope**: Read `cli-commands.json`. Group the commands into navigation sections by stable rule (e.g. prefix before `:` or `-`, falling back to a "Misc" group). Build `src/AppShell.tsx` with a header (app title, version badge), a left-rail nav listing groups → commands as router links, and a `<main>` that renders the active route. Replace `src/App.tsx` to render `<AppShell />`. The grouping rule must be deterministic and re-runnable so adding a new command in `cli-commands.json` updates the nav without code edits — derive groups at build time from the manifest.
- **inputs**:
  - `cli-commands.json`
  - `packages/mission-control-frontend/src/ui/index.ts`
  - `packages/mission-control-frontend/src/App.tsx`
- **outputs**:
  - `packages/mission-control-frontend/src/AppShell.tsx`
  - `packages/mission-control-frontend/src/Nav.tsx`
  - `packages/mission-control-frontend/src/App.tsx`
- **checks**:
  - shell-exists: `test -s packages/mission-control-frontend/src/AppShell.tsx`
  - nav-exists: `test -s packages/mission-control-frontend/src/Nav.tsx`
  - shell-imports-nav: `grep -qE "from +['\"]\\./Nav['\"]" packages/mission-control-frontend/src/AppShell.tsx`
  - app-renders-shell: `grep -qE "AppShell" packages/mission-control-frontend/src/App.tsx`
  - nav-uses-manifest: `grep -qE "cli-commands\\.json|commandsManifest" packages/mission-control-frontend/src/Nav.tsx`
- **body**: |
    1. Read `cli-commands.json` and decide on the grouping rule (prefer prefix before the first `:`/`-`/`.`; if none, group as `general`).
    2. Write `src/Nav.tsx` that imports `cli-commands.json` (Vite supports JSON imports natively) and renders `<section>` per group with `<a>` / framework router links pointing at `/commands/:name` for each command. Highlight the active route. Use primitives from `../ui` for styling.
    3. Write `src/AppShell.tsx` with a flex layout: header (app title), `<aside><Nav/></aside>`, `<main>{children}</main>`. It accepts a `children` prop for the active route element so the router (`04-router-registry`) plugs in.
    4. Rewrite `src/App.tsx` to render `<AppShell>{routerOutlet}</AppShell>` — leave `routerOutlet` as an import from `./router` even though `04-router-registry` will create that file. The build will fail until `04-router-registry` lands; that is intentional and gates the order.
    5. Do NOT enumerate commands by hand; everything must derive from `cli-commands.json`.

## 04-router-registry — Router and route registry
- **kind**: executable
- **goal**: Register one placeholder route per converge CLI command and publish a route registry so `05-command-views` knows which slot to fill for each command.
- **scope**: Build `src/router/index.tsx` that registers a route at `/commands/:name` for every entry in `cli-commands.json`, mounting a stub component per command (auto-generated). Also generate one stub `src/views/<safe-name>/View.tsx` per command (renders only the command name and a "Not yet implemented" notice — `05-command-views` will overwrite these). Publish `route-registry.json` at this node's working directory so the downstream wbs can read it. The `name → componentPath` mapping is the parity contract: every command in `cli-commands.json` MUST have an entry in `route-registry.json`, and the path string MUST point at the file `05-command-views` is supposed to fill.
- **inputs**:
  - `cli-commands.json`
  - `packages/mission-control-frontend/src/AppShell.tsx`
- **outputs**:
  - `packages/mission-control-frontend/src/router/index.tsx`
  - `packages/mission-control-frontend/src/views/`
  - `route-registry.json`
- **checks**:
  - router-exists: `test -s packages/mission-control-frontend/src/router/index.tsx`
  - registry-exists: `test -s route-registry.json`
  - registry-shape: `node -e "const r=require('./route-registry.json'); if(!Array.isArray(r.routes)||r.routes.length<1) process.exit(1); for(const e of r.routes){if(!e.command||!e.path||!e.componentPath) process.exit(1)}"`
  - registry-covers-manifest: `node -e "const cmds=require('./cli-commands.json').commands; const reg=require('./route-registry.json').routes; if(reg.length!==cmds.length) process.exit(1); for(const c of cmds){if(!reg.find(r=>r.command===c.name)) process.exit(1)}"`
  - stubs-count: `find packages/mission-control-frontend/src/views -name 'View.tsx' | wc -l | node -e "const n=+require('fs').readFileSync(0,'utf8').trim();const m=require('./cli-commands.json').commands.length;process.exit(n===m?0:1)"`
- **body**: |
    1. Load `cli-commands.json`. For each `command`:
       - Compute `safeName` by lower-casing and replacing any character not in `[a-z0-9-]` with `-` (so `plan:run` → `plan-run`). Collisions after sanitization should error and stop — stable identity matters.
       - Write `src/views/<safeName>/View.tsx` as a 10-line stub that renders the command name plus the description from the manifest and a "Not yet implemented — owned by 05-command-views" notice.
       - Add a route entry: `path: '/commands/<safeName>'`, lazy-importing `./views/<safeName>/View`.
    2. Write `src/router/index.tsx` exporting `routerOutlet` (or the framework's equivalent — `<RouterProvider/>` / `<Router/>`) wired to the generated routes plus a default `/` route that renders a "Welcome to Mission Control" landing page listing the groups from `Nav`.
    3. Write `route-registry.json` at this node's working directory (NOT inside the package) with shape:
       ```json
       { "routes": [
         { "command": "<original name>", "safeName": "<safe>", "path": "/commands/<safe>",
           "componentPath": "packages/mission-control-frontend/src/views/<safe>/View.tsx" }
       ] }
       ```
       This is what `05-command-views`'s wbs driver reads to know where to write each view.
    4. Sort routes by `command` for stability across reruns.
    5. Sanity-build: ensure the package `typecheck` script passes after this child runs (the `App.tsx` import of `./router` introduced by `03-app-shell` should now resolve).

# Open questions

- **Frontend package path.** I assumed `packages/mission-control-frontend/`. If `02-architecture` chose a different location (e.g. `apps/mission-control-frontend`, `packages/mission-control/web`), every check path here is wrong by that delta. The check commands need to be updated once `ARCHITECTURE.md` exists, OR `00-scaffold` should refuse to write anywhere else.
- **Framework choice cascades into every child.** All five children's bodies handwave "react/solid/vue equivalent". If `02-architecture` is decisive, the bodies should be tightened to that one stack. Surface here so re-planning is cheap.
- **Streaming transport.** `01-api-client`'s `runCommand` sketch lists SSE / WebSocket / chunked HTTP / polling as alternatives. The actual implementation is one of them; the choice changes the public callback shape. `ARCHITECTURE.md` must commit before this child runs.
- **Stub view path convention.** `05-command-views` will overwrite the stubs in `src/views/<safeName>/View.tsx`. If its wbs uses a different convention (e.g. one file per command at `src/views/<safeName>.tsx` with no folder), `route-registry.json` becomes wrong. The two siblings must agree on the path shape — currently I am dictating it via the registry, but `05-command-views`'s planner could disagree.
- **No `cli-commands.json` in scope packet.** I cannot validate the field shape (`name`, `description`, `args`, `options`) my children assume. If `00-cli-inventory` produces a different shape, `03-app-shell`'s grouping rule and `04-router-registry`'s safeName derivation may need to change.
- **Pre-existing `mission-control` package.** Per the planning rules I did not read siblings/descendants or scan the tree. If the repo already has a partial `packages/mission-control-frontend/` (or similar), `00-scaffold` will collide. Worth a `git ls-files` early in `00-scaffold` to detect and bail with a clear message rather than overwrite.
