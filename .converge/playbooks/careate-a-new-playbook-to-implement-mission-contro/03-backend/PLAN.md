---
kind: container
children:
  - id: 00-scaffold
    kind: executable
    title: Server scaffold and health route
  - id: 01-command-runner
    kind: executable
    title: Generic command runner with streaming
  - id: 02-artifact-routes
    kind: executable
    title: Read endpoints for journal, playbooks, and artifacts
  - id: 03-endpoint-registry
    kind: executable
    title: Publish endpoint-registry.json contract for frontend
---

# Goal

Stand up the mission-control backend: a server that turns every converge CLI command into a streamable HTTP endpoint, exposes read endpoints for on-disk artifacts (journal entries, playbooks, logs), and publishes a single `endpoint-registry.json` that downstream UI work consumes as a contract.

# Decision

Container with four executables in a strict file-gated chain.

The CLI surface is broad but uniform — every command takes `args[]` + `options{}` and emits stdout/stderr until exit. That uniformity means we do NOT need one endpoint per command (and therefore NOT a `wbs` here): one *generic* runner endpoint (`POST /api/commands/:name`) plus an `args/options` validation step against `cli-commands.json` covers the entire surface. The per-command shape lives in the frontend (`05-command-views`), where the command spec drives form rendering.

That collapses the backend into four concerns: (1) a runnable server, (2) the generic command runner + streaming transport, (3) filesystem read endpoints for artifacts, (4) the contract file the frontend consumes. Each is a single, focused executable with one primary artifact and one task-local manifest summarising what it produced; the manifests are how later children find the package path, runner mount point, and route list without re-deriving them.

# Children

## 00-scaffold — Server scaffold and health route
- **kind**: executable
- **goal**: Create the backend package skeleton in the location ARCHITECTURE.md prescribes — runnable server with a `/healthz` route — and publish a manifest later children read to find the package layout.
- **scope**: Read `ARCHITECTURE.md` to resolve package path, framework choice (e.g. Express/Fastify/Hono), language/runtime, and dev/build/test tooling. Generate `package.json`, tsconfig (if TS), the server entry file, a `/healthz` route returning `{ ok: true, version }`, and the bootstrap that starts the server on a configurable port. Write `scaffold-manifest.json` to the task dir summarising what was created.
- **inputs**:
  - `ARCHITECTURE.md`
- **outputs**:
  - `scaffold-manifest.json` (task-dir; `{ packagePath, entryFile, framework, runtime, healthRoute, defaultPort }`)
  - the package files at `packagePath` (per ARCHITECTURE.md)
- **checks**:
  - manifest-exists: `test -s scaffold-manifest.json`
  - manifest-shape: `node -e "const m=require('./scaffold-manifest.json'); for (const k of ['packagePath','entryFile','framework','healthRoute','defaultPort']) if(!m[k]) process.exit(1)"`
  - package-files-exist: `node -e "const m=require('./scaffold-manifest.json'),fs=require('fs'),p=require('path'); for (const f of [p.join(m.packagePath,'package.json'), p.join(m.packagePath,m.entryFile)]) if(!fs.existsSync(f)) process.exit(1)"`
- **body**: |
    1. Read `ARCHITECTURE.md` and extract: package path (e.g. `packages/mission-control-server`), framework, runtime/language, default port, dev script convention, and any monorepo workspace conventions already used in this repo (peek at `packages/cli/package.json` for style consistency).
    2. Create the package directory. Write `package.json` with the chosen framework as a dependency, `start` and `dev` scripts, and (if TS) `build`. Add tsconfig.json if applicable, mirroring the style of `packages/cli/tsconfig.json`.
    3. Write the entry file (e.g. `src/server.ts`): construct the framework's app, mount a `routes/` directory, register `GET /healthz` returning `{ ok: true, version: <package.json version> }`, listen on `process.env.PORT ?? <defaultPort>`. Keep this < ~80 lines — this child is scaffolding, not feature work.
    4. Add a one-line README inside the package describing how to start it (`npm run dev`).
    5. Write `scaffold-manifest.json` to the task directory with `{ packagePath, entryFile, framework, runtime, healthRoute: "/healthz", defaultPort }`. Use the package path *relative to the repo root* so checks can resolve it.

## 01-command-runner — Generic command runner with streaming
- **kind**: executable
- **goal**: Implement the generic endpoint that invokes any converge CLI command, validates `args/options` against `cli-commands.json`, and streams stdout/stderr to the client until exit.
- **scope**: Add a runner module that spawns the converge CLI as a subprocess (or in-process import — whichever ARCHITECTURE.md picks), forwards `args/options` after validating against the manifest, and pipes output through the streaming transport ARCHITECTURE.md selected (SSE / WebSocket / chunked). Mount it on the server scaffolded by `00-scaffold`. Publish `runner-manifest.json` recording the mount path, HTTP method, and streaming transport so `03-endpoint-registry` can record it.
- **inputs**:
  - `ARCHITECTURE.md`
  - `cli-commands.json`
  - `scaffold-manifest.json`
- **outputs**:
  - `runner-manifest.json` (task-dir; `{ method, path, streaming, contentType }`)
  - runner module + route file at `<packagePath>/src/runner/` and `<packagePath>/src/routes/commands.*`
- **checks**:
  - manifest-exists: `test -s runner-manifest.json`
  - manifest-shape: `node -e "const m=require('./runner-manifest.json'); if(m.method!=='POST'||!m.path||!m.streaming) process.exit(1); if(!m.path.includes(':name')&&!m.path.includes('{name}')) process.exit(1)"`
  - source-files-exist: `node -e "const s=require('./scaffold-manifest.json'),fs=require('fs'),p=require('path'); const dir=p.join(s.packagePath,'src'); const found=fs.readdirSync(dir,{recursive:true}).some(f=>String(f).match(/runner|command/i)); if(!found) process.exit(1)"`
  - validates-against-manifest: `node -e "const fs=require('fs'),p=require('path'),s=require('./scaffold-manifest.json'); const files=fs.readdirSync(p.join(s.packagePath,'src'),{recursive:true}).map(f=>p.join(s.packagePath,'src',String(f))).filter(f=>{try{return fs.statSync(f).isFile()}catch{return false}}); const blob=files.map(f=>fs.readFileSync(f,'utf8')).join('\n'); if(!blob.includes('cli-commands.json')&&!blob.match(/commands\s*[:=]/)) process.exit(1)"`
- **body**: |
    1. Read `scaffold-manifest.json` to find package path / framework, `ARCHITECTURE.md` to confirm streaming transport + invocation strategy (spawn vs in-process), and `cli-commands.json` for the command catalog.
    2. Build a small command-spec loader that loads `cli-commands.json` at startup and exposes `getCommand(name)` and `validate(name, args, options)` (reject unknown commands; reject unknown options; coerce types declared in the spec).
    3. Build a runner module: signature `run(commandName, args, options) -> { stream, done }` where `stream` emits `{ type: 'stdout'|'stderr', data }` events and `done` resolves to `{ exitCode }`. If ARCHITECTURE.md picked subprocess invocation, use `child_process.spawn`; if in-process, dynamically import `@converge/core` (or equivalent). Forward stdin only if the spec marks the command interactive (skip for v1 if unspecified).
    4. Mount the route. Endpoint contract: `POST /api/commands/:name` with JSON body `{ args: string[], options: Record<string,unknown> }`. Validate, run, and stream events using the transport ARCHITECTURE.md picked. Surface the final `exitCode` as the terminal event of the stream and (where the transport supports it) close the connection cleanly.
    5. Register the route on the server entry from `00-scaffold` (extend the entry file's route registration — do not create a parallel server).
    6. Write `runner-manifest.json` to the task directory: `{ method: "POST", path: "/api/commands/:name", streaming: "<sse|websocket|chunked>", contentType: "<text/event-stream|...>" }`.

## 02-artifact-routes — Read endpoints for journal, playbooks, and artifacts
- **kind**: executable
- **goal**: Expose the on-disk artifacts mission control needs to render its monitoring/browse views — journal entries, playbook tree, and any other read targets ARCHITECTURE.md flags — as JSON read endpoints.
- **scope**: Implement read-only endpoints over the `.converge/journal/`, `.converge/playbooks/`, and `.converge/logs/` directory trees (or whatever set ARCHITECTURE.md prescribes). Endpoints should list directory contents and return file contents (with safe path normalization, no traversal). Mount on the server from `00-scaffold`. Publish `artifacts-manifest.json` listing each registered route so `03-endpoint-registry` can include them.
- **inputs**:
  - `ARCHITECTURE.md`
  - `scaffold-manifest.json`
- **outputs**:
  - `artifacts-manifest.json` (task-dir; `{ routes: [{ name, method, path, kind: "list"|"read", source }] }`)
  - route files at `<packagePath>/src/routes/`
- **checks**:
  - manifest-exists: `test -s artifacts-manifest.json`
  - manifest-shape: `node -e "const m=require('./artifacts-manifest.json'); if(!Array.isArray(m.routes)||m.routes.length<2) process.exit(1); for(const r of m.routes){for(const k of ['name','method','path','kind','source']) if(!r[k]) process.exit(1); if(!['list','read'].includes(r.kind)) process.exit(1); if(!r.path.startsWith('/api/')) process.exit(1)}"`
  - covers-required-domains: `node -e "const m=require('./artifacts-manifest.json'); const names=new Set(m.routes.map(r=>r.name.toLowerCase())); for(const need of ['journal','playbook']) if(![...names].some(n=>n.includes(need))) process.exit(1)"`
  - source-files-exist: `node -e "const s=require('./scaffold-manifest.json'),fs=require('fs'),p=require('path'); const dir=p.join(s.packagePath,'src'); const blob=fs.readdirSync(dir,{recursive:true}).filter(f=>String(f).endsWith('.ts')||String(f).endsWith('.js')).map(f=>fs.readFileSync(p.join(dir,String(f)),'utf8')).join('\n'); if(!blob.includes('journal')||!blob.includes('playbook')) process.exit(1)"`
- **body**: |
    1. Read `scaffold-manifest.json` for the package path and `ARCHITECTURE.md` for the artifact set + workspace-resolution rules (single cwd vs configurable workspace root).
    2. Implement a small `safeJoin(root, relPath)` that rejects `..` traversal and absolute paths, used by every read endpoint.
    3. Add at minimum:
       - `GET /api/journal` — list entries (directory walk under `.converge/journal/`).
       - `GET /api/journal/*` — read a single journal file (text or JSON, content-type by extension).
       - `GET /api/playbooks` — list playbooks under `.converge/playbooks/`.
       - `GET /api/playbooks/*` — read a playbook file or directory listing.
       - any additional artifact routes ARCHITECTURE.md mandates (e.g. logs).
    4. Each route returns JSON `{ entries: [...] }` for listings and `{ path, content }` for reads. 404 on missing, 400 on traversal, 500 on read errors with a stable error shape.
    5. Register the routes on the server entry from `00-scaffold`.
    6. Write `artifacts-manifest.json` to the task directory enumerating every registered route with `{ name, method, path, kind, source }` (where `source` is the on-disk root, e.g. `.converge/journal`).

## 03-endpoint-registry — Publish endpoint-registry.json contract for frontend
- **kind**: executable
- **goal**: Combine the runner endpoint and artifact endpoints into a single `endpoint-registry.json` that `04-frontend-shell` and `05-command-views` consume as the authoritative API contract — they should never have to read sibling manifests directly.
- **scope**: Read `runner-manifest.json` + `artifacts-manifest.json` + `cli-commands.json`. Emit `endpoint-registry.json` containing the API base URL, the runner endpoint and how to invoke it for a given command name, and the artifact endpoint list. This is the file the frontend wbs (`05-command-views`) treats as input — keep its shape stable and machine-readable.
- **inputs**:
  - `cli-commands.json`
  - `runner-manifest.json`
  - `artifacts-manifest.json`
  - `scaffold-manifest.json`
  - `ARCHITECTURE.md`
- **outputs**:
  - `endpoint-registry.json` (task-dir)
- **checks**:
  - registry-exists: `test -s endpoint-registry.json`
  - registry-shape: `node -e "const r=require('./endpoint-registry.json'); for(const k of ['baseUrl','runner','artifacts','commands']) if(!(k in r)) process.exit(1); if(!r.runner.path||!r.runner.method||!r.runner.streaming) process.exit(1); if(!Array.isArray(r.artifacts)||!Array.isArray(r.commands)) process.exit(1)"`
  - covers-every-cli-command: `node -e "const r=require('./endpoint-registry.json'),c=require('./cli-commands.json'); const inReg=new Set(r.commands.map(x=>x.name)); for(const cmd of c.commands) if(!inReg.has(cmd.name)){console.error('missing',cmd.name);process.exit(1)}"`
  - artifact-count-matches: `node -e "const r=require('./endpoint-registry.json'),a=require('./artifacts-manifest.json'); if(r.artifacts.length!==a.routes.length) process.exit(1)"`
- **body**: |
    1. Load all four manifests + ARCHITECTURE.md. Derive `baseUrl` from ARCHITECTURE.md (e.g. `http://localhost:<defaultPort>` for local dev).
    2. Build the registry object:
       ```
       {
         "baseUrl": "<from architecture>",
         "runner": { "method": "POST", "path": "/api/commands/:name",
                     "streaming": "<sse|websocket|chunked>",
                     "contentType": "<...>",
                     "requestSchema": { "args": "string[]", "options": "object" } },
         "commands": [
           { "name": "<cli command name>",
             "endpoint": "<runner.path with :name substituted>",
             "spec": { "args": [...], "options": [...], "description": "...", "examples": [...] } },
           ... one per cli-commands.json[].commands
         ],
         "artifacts": [
           { "name": "...", "method": "GET", "path": "/api/...", "kind": "list|read", "source": "..." },
           ... one per artifacts-manifest.routes
         ]
       }
       ```
    3. Pre-resolve the per-command endpoint URL (`runner.path` with `:name` already substituted) so the frontend doesn't have to do template substitution at call time.
    4. Write `endpoint-registry.json` to the task directory. Sort `commands` alphabetically by `name` for stable diffs across reruns.
    5. Sanity-check: every entry of `cli-commands.json[].commands` appears in `commands`. Every entry of `artifacts-manifest.routes` appears in `artifacts`. Fail loudly if not.

# Open questions

- **Streaming transport not yet pinned.** ARCHITECTURE.md is supposed to choose SSE / WebSocket / chunked HTTP. Each implies a slightly different runner shape. The runner child reads ARCHITECTURE.md and implements whatever it picks; if architecture defers, runner will need to pick a default and surface that decision back into `ARCHITECTURE.md`'s "Open Decisions" — flagging here so the architecture sibling pins it down.
- **CLI invocation strategy** (subprocess `spawn` vs in-process `@converge/core` import) is also an architecture decision. Subprocess is simpler and reproduces real CLI behavior; in-process is faster but couples the server to core internals. Runner child defers to ARCHITECTURE.md.
- **Workspace scope.** If mission control eventually serves multiple workspaces, the artifact routes need a `?workspace=` parameter and the runner needs a working-dir parameter. v1 assumes single-cwd; revisit when PRD pins multi-workspace support.
- **Destructive commands.** PRD should pin whether destructive CLI commands (clear journal, reset) are exposed. The generic runner exposes everything in `cli-commands.json` — if PRD excludes a subset, that filter belongs in the command-spec loader (01-command-runner) and should be added there once known.
- **Auth.** Assumed local-only/unauthenticated for v1. If ARCHITECTURE.md flips this, add an auth middleware concern — likely a 5th child rather than expanding scaffold.
- **No integration smoke-test child** (boots the server, hits `/healthz` and a sample command). Each executable's checks verify its own slice; an end-to-end test would catch wire-up bugs but adds runtime + port allocation complexity. Flag for the user — happy to add `04-smoke-test` if desired.
- **Pre-existing prototype.** Per planning rules I did not read siblings or descendants. If a prior `mission-control-server` package already exists in the repo, the scaffold child should detect and extend rather than green-field — the body says "create" but should fall back to "extend if found".
