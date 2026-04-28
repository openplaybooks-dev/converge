---
title: Router and route registry
outputs:
  - packages/mission-control-frontend/src/router/index.tsx
  - packages/mission-control-frontend/src/views/
  - route-registry.json
checks:
  - id: router-exists
    cmd: "test -s packages/mission-control-frontend/src/router/index.tsx"
    description: Router entry file is present and non-empty
  - id: registry-exists
    cmd: "test -s route-registry.json"
    description: route-registry.json is present and non-empty
  - id: registry-shape
    cmd: "node -e \"const r=require('./route-registry.json'); if(!Array.isArray(r.routes)||r.routes.length<1) process.exit(1); for(const e of r.routes){if(!e.command||!e.path||!e.componentPath) process.exit(1)}\""
    description: route-registry.json has a non-empty routes array with command/path/componentPath on every entry
  - id: registry-covers-manifest
    cmd: "node -e \"const cmds=require('./cli-commands.json').commands; const reg=require('./route-registry.json').routes; if(reg.length!==cmds.length) process.exit(1); for(const c of cmds){if(!reg.find(r=>r.command===c.name)) process.exit(1)}\""
    description: Every command in cli-commands.json has a matching entry in route-registry.json
  - id: stubs-count
    cmd: "find packages/mission-control-frontend/src/views -name 'View.tsx' | wc -l | node -e \"const n=+require('fs').readFileSync(0,'utf8').trim();const m=require('./cli-commands.json').commands.length;process.exit(n===m?0:1)\""
    description: One stub View.tsx exists per command in cli-commands.json
  - id: views-dir-exists
    cmd: "test -d packages/mission-control-frontend/src/views"
    description: Views directory was created
  - id: router-imports-views
    cmd: "grep -qE \"\\./views/\" packages/mission-control-frontend/src/router/index.tsx"
    description: Router file references the generated views directory
---

# Router and route registry

**Goal**: Register one placeholder route per converge CLI command and publish a route registry so `05-command-views` knows which slot to fill for each command.

## Scope

Build `src/router/index.tsx` that registers a route at `/commands/:name` for every entry in `cli-commands.json`, mounting a stub component per command (auto-generated). Also generate one stub `src/views/<safe-name>/View.tsx` per command (renders only the command name and a "Not yet implemented" notice — `05-command-views` will overwrite these). Publish `route-registry.json` at this node's working directory so the downstream wbs can read it. The `name → componentPath` mapping is the parity contract: every command in `cli-commands.json` MUST have an entry in `route-registry.json`, and the path string MUST point at the file `05-command-views` is supposed to fill.

### Inputs

- `cli-commands.json` (produced by an earlier sibling task — read at this node's working directory or the playbook root, whichever the runtime exposes)
- `packages/mission-control-frontend/src/AppShell.tsx` (produced by `03-app-shell`; the router this task writes plugs into the shell)

### Outputs

- `packages/mission-control-frontend/src/router/index.tsx`
- `packages/mission-control-frontend/src/views/<safeName>/View.tsx` (one per command)
- `route-registry.json` (at this node's working directory, NOT inside the package)

## Instructions

1. **Load the manifest.** Read `cli-commands.json`. It is expected to expose `commands: Array<{ name: string; description?: string; args?: unknown; options?: unknown }>`. If the field shape differs, treat `name` as the only required field and pass the rest through as available.

2. **Compute `safeName` for every command.** For each `command.name`:
   - Lower-case the name.
   - Replace any character not in `[a-z0-9-]` with `-` (so `plan:run` → `plan-run`, `journal.show` → `journal-show`).
   - Collapse runs of `-` is optional but acceptable; do whatever keeps identity stable.
   - After the rewrite, check for collisions across all commands. If two distinct `name` values produce the same `safeName`, **error out** with a clear message and stop — stable identity matters more than recovering.

3. **Generate one stub view per command.** For each command, write `packages/mission-control-frontend/src/views/<safeName>/View.tsx` as a ~10-line stub. The file must:
   - Default-export a component named `View` (or the framework equivalent).
   - Render the command's `name`.
   - Render the command's `description` if present.
   - Render the literal text "Not yet implemented — owned by 05-command-views" so `05-command-views` can grep for it before overwriting.
   - Use only primitives from `../../ui` if any styling is needed; do NOT import the API client or the router itself.

4. **Write the router.** Write `packages/mission-control-frontend/src/router/index.tsx`:
   - Import the framework's router (e.g. `react-router-dom`'s `createBrowserRouter` / `RouterProvider`, or the framework equivalent dictated by `ARCHITECTURE.md`).
   - For each command, register a route at `path: '/commands/<safeName>'` that lazy-imports `./views/<safeName>/View` (use the framework's lazy/dynamic import primitive — `React.lazy` + `Suspense`, or equivalent).
   - Register a default `/` route that renders a "Welcome to Mission Control" landing page listing the navigation groups produced by `Nav` (you may import `Nav` or duplicate the grouping rule from `cli-commands.json`).
   - Export the router-mounting element as `routerOutlet` (or whatever symbol `src/App.tsx` from `03-app-shell` already imports — `grep -n "from './router'" packages/mission-control-frontend/src/App.tsx` to confirm the export name) so `App.tsx` resolves cleanly.

5. **Sort routes for determinism.** Sort the route entries by `command` (the original, un-sanitized name) ascending before serializing them anywhere — both inside the router file (where the array is iterated) and in the registry JSON.

6. **Write `route-registry.json`** at this node's working directory (NOT inside the package). Shape:

   ```json
   {
     "routes": [
       {
         "command": "<original name>",
         "safeName": "<safe>",
         "path": "/commands/<safe>",
         "componentPath": "packages/mission-control-frontend/src/views/<safe>/View.tsx"
       }
     ]
   }
   ```

   Every command in `cli-commands.json` MUST appear exactly once. The `componentPath` MUST match the file path you wrote in step 3 — `05-command-views`'s wbs driver reads this to decide where to write each view, so a mismatch silently breaks the next phase.

7. **Sanity-build.** From the package directory, run the `typecheck` script (e.g. `npm --prefix packages/mission-control-frontend run typecheck` or `pnpm -F @converge/mission-control-frontend typecheck`). The build was intentionally broken by `03-app-shell` (it imports from `./router` which did not exist). After this task lands, `App.tsx`'s import of `./router` should resolve, and `typecheck` should pass. If it fails for a reason other than your changes, fix the cause or surface it loudly — do NOT mark the task complete with a broken typecheck.

8. **Tools.** Use `Read` for `cli-commands.json` and the existing `App.tsx`/`AppShell.tsx`. Use `Bash` (`mkdir -p`) to create per-command view directories. Use `Write` to emit each view stub, the router file, and `route-registry.json`. Use `Bash` for the final `typecheck` invocation.

## Notes / gaps flagged for the user

- PLAN.md's open questions list several upstream uncertainties that affect this task:
  - **Frontend package path** — every output path here assumes `packages/mission-control-frontend/`. If `ARCHITECTURE.md` chose differently and `00-scaffold` honored that, update both the view stub paths and `route-registry.json`'s `componentPath` strings to match.
  - **Framework choice** — the router primitive and lazy-import shape depend on the framework. Adapt step 4's exact API (`createBrowserRouter` vs `Router` vs Solid's `Router` vs Vue Router) to match what `00-scaffold` installed.
  - **`cli-commands.json` shape** — only `name` is treated as required. If the actual manifest uses a different top-level key (e.g. `entries` instead of `commands`), the code generation here needs to track that field name.
  - **Stub view path convention** — `05-command-views` may want a different file layout. The registry's `componentPath` is the binding contract; if `05-command-views`'s planner picks something else, it must rewrite this registry rather than diverge silently.
