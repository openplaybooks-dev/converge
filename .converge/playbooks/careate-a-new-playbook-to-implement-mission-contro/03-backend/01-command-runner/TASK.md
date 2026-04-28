---
title: Generic command runner with streaming
outputs:
  - runner-manifest.json
  - "<packagePath>/src/runner/ (runner module files)"
  - "<packagePath>/src/routes/commands.* (route file)"
checks:
  - id: manifest-exists
    cmd: test -s runner-manifest.json
    description: runner-manifest.json exists and is non-empty
  - id: manifest-shape
    cmd: "node -e \"const m=require('./runner-manifest.json'); if(m.method!=='POST'||!m.path||!m.streaming) process.exit(1); if(!m.path.includes(':name')&&!m.path.includes('{name}')) process.exit(1)\""
    description: manifest has POST method, path with :name or {name}, and streaming transport
  - id: source-files-exist
    cmd: "node -e \"const s=require('./scaffold-manifest.json'),fs=require('fs'),p=require('path'); const dir=p.join(s.packagePath,'src'); const found=fs.readdirSync(dir,{recursive:true}).some(f=>String(f).match(/runner|command/i)); if(!found) process.exit(1)\""
    description: at least one runner/command source file exists under packagePath/src
  - id: validates-against-manifest
    cmd: "node -e \"const fs=require('fs'),p=require('path'),s=require('./scaffold-manifest.json'); const files=fs.readdirSync(p.join(s.packagePath,'src'),{recursive:true}).map(f=>p.join(s.packagePath,'src',String(f))).filter(f=>{try{return fs.statSync(f).isFile()}catch{return false}}); const blob=files.map(f=>fs.readFileSync(f,'utf8')).join('\\n'); if(!blob.includes('cli-commands.json')&&!blob.match(/commands\\s*[:=]/)) process.exit(1)\""
    description: source references cli-commands.json or a commands spec
  - id: scaffold-manifest-prereq
    cmd: test -s scaffold-manifest.json
    description: scaffold-manifest.json from sibling 00-scaffold must be available (copy or symlink into this task dir before running checks)
---

# Generic command runner with streaming

**Goal**: Implement the generic endpoint that invokes any converge CLI command, validates `args/options` against `cli-commands.json`, and streams stdout/stderr to the client until exit.

## Scope

Add a runner module that spawns the converge CLI as a subprocess (or in-process import — whichever ARCHITECTURE.md picks), forwards `args/options` after validating against the manifest, and pipes output through the streaming transport ARCHITECTURE.md selected (SSE / WebSocket / chunked). Mount it on the server scaffolded by `00-scaffold`. Publish `runner-manifest.json` recording the mount path, HTTP method, and streaming transport so `03-endpoint-registry` can record it.

**Inputs**:
- `ARCHITECTURE.md` (sibling artifact from architecture phase — read for streaming transport choice and CLI invocation strategy)
- `cli-commands.json` (sibling artifact — the command catalog the runner validates against)
- `scaffold-manifest.json` (produced by sibling `00-scaffold` — provides `packagePath`, `entryFile`, `framework`)

**Outputs**:
- `runner-manifest.json` in this task directory with shape `{ method, path, streaming, contentType }`
- runner module files at `<packagePath>/src/runner/`
- route file(s) at `<packagePath>/src/routes/commands.*` (extension matches the framework/runtime chosen by `00-scaffold`)

## Instructions

1. **Locate inputs.** Read `scaffold-manifest.json` (in this task dir; if missing, copy it from sibling `../00-scaffold/scaffold-manifest.json`) to get `packagePath`, `entryFile`, and `framework`. Read `ARCHITECTURE.md` (sibling at the parent `03-backend/` level or repo-level — confirm location before reading) to confirm:
   - streaming transport: SSE, WebSocket, or chunked HTTP
   - CLI invocation strategy: subprocess via `child_process.spawn` vs in-process import of `@converge/core`
   - whether stdin forwarding is required for v1
   Read `cli-commands.json` (sibling artifact) for the command catalog shape (the `commands[]` array, each entry's `args`, `options`, etc.).

2. **Build a command-spec loader.** Create `<packagePath>/src/runner/command-spec.ts` (or `.js` matching scaffold language) that:
   - Loads `cli-commands.json` once at module init (resolve path relative to repo root or from an env var).
   - Exposes `getCommand(name: string)` returning the spec entry or `undefined`.
   - Exposes `validate(name, args, options)` that:
     - rejects unknown command names (throw a typed error e.g. `UnknownCommandError`)
     - rejects unknown option keys (throw `UnknownOptionError`)
     - coerces values to types declared in the spec (string/number/boolean/array)
     - returns `{ args, options }` normalized

3. **Build the runner module.** Create `<packagePath>/src/runner/run.ts` with signature:
   ```
   run(commandName: string, args: string[], options: Record<string, unknown>)
     -> { stream: AsyncIterable<{ type: 'stdout'|'stderr', data: string }>, done: Promise<{ exitCode: number }> }
   ```
   - If ARCHITECTURE.md picks **subprocess**: use `child_process.spawn` with the resolved converge CLI binary; pipe stdout/stderr through the stream as UTF-8 chunks; resolve `done` on the `'close'` event with `exitCode`.
   - If ARCHITECTURE.md picks **in-process**: dynamically `import('@converge/core')` (or whatever the architecture names), redirect its logger / stdio handlers into the stream emitter, await the command's exported entry, resolve `done` with the returned exit code (default `0` on success, non-zero on thrown error).
   - Forward stdin **only** if the spec marks the command interactive (skip for v1 if unspecified — flag in code with a TODO referencing the open question).

4. **Mount the route.** Create `<packagePath>/src/routes/commands.ts` (extension matching the framework). Endpoint contract:
   - method: `POST`
   - path: `/api/commands/:name`
   - request body (JSON): `{ args: string[], options: Record<string, unknown> }`
   - flow: call `validate(name, args, options)` → on validation error return `400` with stable error shape `{ error: { code, message } }` → on success call `run(...)` → stream events to the client using the transport ARCHITECTURE.md selected:
     - **SSE**: set `Content-Type: text/event-stream`, write `event: <type>\ndata: <json>\n\n` per chunk, terminal `event: exit\ndata: { "exitCode": n }\n\n`, then `res.end()`.
     - **WebSocket**: upgrade, send each chunk as a JSON message, send terminal `{ type: 'exit', exitCode }`, then close.
     - **chunked**: `Transfer-Encoding: chunked`, write JSON-lines (one event per line), terminal exit line, then `res.end()`.
   - Surface the final `exitCode` as the terminal event.

5. **Register on the server entry.** Open `<packagePath>/<entryFile>` (the file `00-scaffold` created) and extend its route registration block to mount the new commands route. Do **not** create a parallel server or duplicate bootstrap. Match the framework's idiomatic registration (e.g. `app.use(commandsRouter)` for Express, `app.route(...)` for Hono, `app.register(...)` for Fastify).

6. **Write `runner-manifest.json`** to this task directory with exactly:
   ```json
   {
     "method": "POST",
     "path": "/api/commands/:name",
     "streaming": "<sse|websocket|chunked>",
     "contentType": "<text/event-stream | application/json | application/x-ndjson | ...>"
   }
   ```
   Use the streaming transport string ARCHITECTURE.md selected. The `contentType` should match the transport (`text/event-stream` for SSE, `application/x-ndjson` for chunked JSON-lines, omit / use `application/json` for WebSocket upgrade).

7. **Verify locally before declaring done.** From this task dir, run each command in the `checks:` block above and confirm exit 0:
   - `test -s runner-manifest.json`
   - the manifest-shape `node -e ...`
   - the source-files-exist `node -e ...`
   - the validates-against-manifest `node -e ...`
   The checks expect `scaffold-manifest.json` and `runner-manifest.json` to be resolvable from the current working directory (the task dir). If `scaffold-manifest.json` is not already in this task dir, copy it from `../00-scaffold/scaffold-manifest.json` so the checks resolve.

## Notes / gaps to flag back to the planner

- **Streaming transport choice is deferred to ARCHITECTURE.md.** If ARCHITECTURE.md does not pin a transport, this child must pick one (default: SSE, as it is the simplest fit for unidirectional stdout/stderr streaming over plain HTTP) and surface the decision back into ARCHITECTURE.md's "Open Decisions" section.
- **CLI invocation strategy (subprocess vs in-process)** is also deferred to ARCHITECTURE.md. If unspecified, default to subprocess `spawn` (simpler, reproduces real CLI behavior, decouples server lifecycle from core internals) and flag back.
- **Destructive command filtering** (clear journal, reset, etc.) is not specified in PLAN.md. The current loader exposes every command in `cli-commands.json`. If the PRD later excludes a subset, add the filter in `command-spec.ts`.
- **Workspace scope** is single-cwd for v1. No `?workspace=` parameter or working-dir override is implemented.
