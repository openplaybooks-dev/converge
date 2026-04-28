---
title: Server scaffold and health route
outputs:
  - scaffold-manifest.json
  - "<packagePath>/package.json"
  - "<packagePath>/<entryFile>"
checks:
  - id: manifest-exists
    cmd: test -s scaffold-manifest.json
    description: scaffold-manifest.json exists and is non-empty in the task directory
  - id: manifest-valid-json
    cmd: node -e "JSON.parse(require('fs').readFileSync('scaffold-manifest.json','utf8'))"
    description: scaffold-manifest.json is valid JSON
  - id: manifest-shape
    cmd: node -e "const m=require('./scaffold-manifest.json'); for (const k of ['packagePath','entryFile','framework','healthRoute','defaultPort']) if(!m[k]) process.exit(1)"
    description: scaffold-manifest.json has required keys (packagePath, entryFile, framework, healthRoute, defaultPort)
  - id: package-files-exist
    cmd: node -e "const m=require('./scaffold-manifest.json'),fs=require('fs'),p=require('path'); for (const f of [p.join(m.packagePath,'package.json'), p.join(m.packagePath,m.entryFile)]) if(!fs.existsSync(f)) { console.error('missing',f); process.exit(1) }"
    description: package.json and entry file exist at the resolved package path
  - id: health-route-registered
    cmd: node -e "const m=require('./scaffold-manifest.json'),fs=require('fs'),p=require('path'); const src=fs.readFileSync(p.join(m.packagePath,m.entryFile),'utf8'); if(!src.includes(m.healthRoute)) process.exit(1)"
    description: entry file contains the configured health route path
  - id: package-json-has-start-script
    cmd: node -e "const m=require('./scaffold-manifest.json'),fs=require('fs'),p=require('path'); const pkg=JSON.parse(fs.readFileSync(p.join(m.packagePath,'package.json'),'utf8')); if(!pkg.scripts||!(pkg.scripts.start||pkg.scripts.dev)) process.exit(1)"
    description: package.json declares at least one of start or dev scripts
---

# Server scaffold and health route

**Goal**: Create the backend package skeleton in the location ARCHITECTURE.md prescribes — a runnable server with a `/healthz` route — and publish a manifest later children read to find the package layout.

## Scope

Read `ARCHITECTURE.md` to resolve package path, framework choice (e.g. Express/Fastify/Hono), language/runtime, and dev/build/test tooling. Generate `package.json`, tsconfig (if TS), the server entry file, a `/healthz` route returning `{ ok: true, version }`, and the bootstrap that starts the server on a configurable port. Write `scaffold-manifest.json` to the task dir summarising what was created.

**Inputs**:
- `ARCHITECTURE.md` (sibling under the parent container `03-backend/`)

**Outputs**:
- `scaffold-manifest.json` written to this task directory with shape `{ packagePath, entryFile, framework, runtime, healthRoute, defaultPort }`. `packagePath` is **relative to the repo root** (e.g. `packages/mission-control-server`) so downstream checks can resolve it deterministically.
- The package files at `<packagePath>/` (per ARCHITECTURE.md): at minimum `package.json` and the entry file declared in `entryFile`.

**Non-goals**:
- No command-runner logic (that's `01-command-runner`).
- No artifact-read routes (that's `02-artifact-routes`).
- No `endpoint-registry.json` (that's `03-endpoint-registry`).
- No tests for the server beyond what compiles/starts. Keep this child small — scaffolding only.

## Instructions

1. **Read `ARCHITECTURE.md`** at the parent container level (`../ARCHITECTURE.md` relative to this task dir) and extract:
   - Package path (e.g. `packages/mission-control-server`).
   - Framework (Express / Fastify / Hono / etc.).
   - Runtime/language (Node + TypeScript vs plain JS; bun vs node).
   - Default port for local dev.
   - Dev/build/test script conventions.
   - Any monorepo workspace conventions already used in this repo. Peek at `packages/cli/package.json` and `packages/cli/tsconfig.json` for style consistency (versioning, tsconfig style, scripts).
   If ARCHITECTURE.md leaves any of these unpinned, pick a sane default and record the choice in the manifest so siblings can rely on it.

2. **Detect prior work**. Before writing, check whether `<packagePath>` already exists. If a `package.json` is already there, treat this as an *extend* rather than a *green-field* scaffold: keep existing content, add only what is missing (entry file, `/healthz` route, scripts), and record `extended: true` in the manifest. If absent, create the directory.

3. **Create the package directory and `package.json`** with:
   - `name`: workspace-scoped name consistent with the repo (e.g. `@converge/mission-control-server`).
   - `version`: `0.0.0` (or match the repo's convention).
   - `private`: `true` if the repo uses private workspaces.
   - The chosen framework as a dependency.
   - `scripts.start` and `scripts.dev` (and `scripts.build` if TypeScript).

4. **Add tsconfig.json** if the framework choice is TypeScript, mirroring `packages/cli/tsconfig.json` style (extend the same base config if one exists at the repo root).

5. **Write the entry file** (e.g. `src/server.ts` or `src/server.js` per the language pick). Constraints:
   - Construct the framework's app.
   - Mount a `routes/` directory placeholder (a single import; siblings `01-command-runner` and `02-artifact-routes` will add files there — do not create those route files yourself).
   - Register `GET /healthz` returning `{ ok: true, version: <package.json version> }`. Read the version from `package.json` at startup.
   - Listen on `process.env.PORT ?? <defaultPort>`.
   - Keep this file under ~80 lines. Scaffolding only — no feature logic.

6. **Add a one-line README** inside the package (`<packagePath>/README.md`) describing how to start it (e.g. `npm run dev`).

7. **Write `scaffold-manifest.json`** to **this task directory** (not the package directory) using `Write`. Shape:
   ```json
   {
     "packagePath": "<repo-relative path, e.g. packages/mission-control-server>",
     "entryFile": "<package-relative path, e.g. src/server.ts>",
     "framework": "<express|fastify|hono|...>",
     "runtime": "<node|bun|...>",
     "healthRoute": "/healthz",
     "defaultPort": <number>
   }
   ```
   `packagePath` MUST be relative to the repo root — checks below resolve files via `path.join(packagePath, ...)` from the task directory, but they invoke `node` from the task directory; emit the path so that, combined with the working directory the converge runtime uses for checks, files resolve. If unsure, prefer absolute paths only as a last resort and document the choice in the manifest.

8. **Verify locally before declaring done**:
   - `node -e "JSON.parse(require('fs').readFileSync('scaffold-manifest.json','utf8'))"` exits 0.
   - The entry file imports cleanly (e.g. `node --check <entryFile>` for plain JS, or `npx tsc --noEmit` from inside the package for TS).
   - The `/healthz` string literal appears in the entry file.

## Notes / known gaps from PLAN.md

- **Streaming transport** (SSE / WebSocket / chunked) is decided in ARCHITECTURE.md and consumed by sibling `01-command-runner`; this scaffold does NOT need to install the transport library itself unless ARCHITECTURE.md specifies it as a base dependency. If unclear, leave to the runner sibling.
- **CLI invocation strategy** (subprocess vs in-process) is also an architecture decision and is out of scope for this child.
- **Auth** is assumed local/unauthenticated for v1 (per PLAN.md open questions). Do not add auth middleware here.
- If `ARCHITECTURE.md` is missing entirely at run time, fail loudly with a clear error message rather than guessing — the parent's plan depends on architecture decisions being pinned.
