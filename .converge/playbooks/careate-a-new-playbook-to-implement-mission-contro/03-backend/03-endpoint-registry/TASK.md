---
title: Publish endpoint-registry.json contract for frontend
outputs:
  - endpoint-registry.json
checks:
  - id: registry-exists
    cmd: test -s endpoint-registry.json
    description: endpoint-registry.json exists and is non-empty
  - id: registry-shape
    cmd: |
      node -e "const r=require('./endpoint-registry.json'); for(const k of ['baseUrl','runner','artifacts','commands']) if(!(k in r)) process.exit(1); if(!r.runner.path||!r.runner.method||!r.runner.streaming) process.exit(1); if(!Array.isArray(r.artifacts)||!Array.isArray(r.commands)) process.exit(1)"
    description: registry has baseUrl, runner (with method/path/streaming), and array fields for artifacts and commands
  - id: covers-every-cli-command
    cmd: |
      node -e "const r=require('./endpoint-registry.json'),c=require('./cli-commands.json'); const inReg=new Set(r.commands.map(x=>x.name)); for(const cmd of c.commands) if(!inReg.has(cmd.name)){console.error('missing',cmd.name);process.exit(1)}"
    description: every CLI command in cli-commands.json appears in the registry's commands list
  - id: artifact-count-matches
    cmd: |
      node -e "const r=require('./endpoint-registry.json'),a=require('./artifacts-manifest.json'); if(r.artifacts.length!==a.routes.length) process.exit(1)"
    description: registry.artifacts has exactly one entry per route in artifacts-manifest.json
  - id: registry-is-valid-json
    cmd: |
      node -e "JSON.parse(require('fs').readFileSync('./endpoint-registry.json','utf8'))"
    description: endpoint-registry.json parses as valid JSON
  - id: commands-have-resolved-endpoints
    cmd: |
      node -e "const r=require('./endpoint-registry.json'); for(const cmd of r.commands){ if(!cmd.endpoint||cmd.endpoint.includes(':name')||cmd.endpoint.includes('{name}')) process.exit(1); if(!cmd.spec) process.exit(1); }"
    description: every command entry has a pre-resolved endpoint URL (no :name placeholder) and a spec
  - id: commands-sorted-alphabetically
    cmd: |
      node -e "const r=require('./endpoint-registry.json'); const names=r.commands.map(x=>x.name); const sorted=[...names].sort(); if(JSON.stringify(names)!==JSON.stringify(sorted)) process.exit(1)"
    description: commands are sorted alphabetically by name for stable diffs
  - id: artifacts-mirror-manifest
    cmd: |
      node -e "const r=require('./endpoint-registry.json'),a=require('./artifacts-manifest.json'); const regPaths=new Set(r.artifacts.map(x=>x.path)); for(const route of a.routes) if(!regPaths.has(route.path)){console.error('missing artifact',route.path);process.exit(1)}"
    description: every path in artifacts-manifest.routes appears in registry.artifacts
---

# Publish endpoint-registry.json contract for frontend

**Goal**: Combine the runner endpoint and artifact endpoints into a single `endpoint-registry.json` that `04-frontend-shell` and `05-command-views` consume as the authoritative API contract — they should never have to read sibling manifests directly.

## Scope

Read `runner-manifest.json` + `artifacts-manifest.json` + `cli-commands.json`. Emit `endpoint-registry.json` containing the API base URL, the runner endpoint and how to invoke it for a given command name, and the artifact endpoint list. This is the file the frontend wbs (`05-command-views`) treats as input — keep its shape stable and machine-readable.

**Inputs** (all expected to be present in the task working directory):

- `cli-commands.json` — catalog of every converge CLI command with its `args`, `options`, description, and examples.
- `runner-manifest.json` — produced by `01-command-runner`; shape `{ method, path, streaming, contentType }`.
- `artifacts-manifest.json` — produced by `02-artifact-routes`; shape `{ routes: [{ name, method, path, kind, source }] }`.
- `scaffold-manifest.json` — produced by `00-scaffold`; shape `{ packagePath, entryFile, framework, runtime, healthRoute, defaultPort }`.
- `ARCHITECTURE.md` — sibling decision doc; defines the API base URL convention (e.g. `http://localhost:<defaultPort>` for local dev) and the streaming transport.

**Outputs**:

- `endpoint-registry.json` (written into the task directory).

## Instructions

1. Load all four manifests + `ARCHITECTURE.md` from the task working directory:
   - `const cliCommands = JSON.parse(fs.readFileSync('./cli-commands.json','utf8'))`
   - `const runner = JSON.parse(fs.readFileSync('./runner-manifest.json','utf8'))`
   - `const artifacts = JSON.parse(fs.readFileSync('./artifacts-manifest.json','utf8'))`
   - `const scaffold = JSON.parse(fs.readFileSync('./scaffold-manifest.json','utf8'))`
   - `const architecture = fs.readFileSync('./ARCHITECTURE.md','utf8')`
   Derive `baseUrl` from `ARCHITECTURE.md` (e.g. `http://localhost:<scaffold.defaultPort>` for local dev). If ARCHITECTURE.md pins a different host/scheme, prefer that; otherwise fall back to the `defaultPort` from `scaffold-manifest.json`.

2. Build the registry object with this exact shape:

   ```json
   {
     "baseUrl": "<from architecture>",
     "runner": {
       "method": "POST",
       "path": "/api/commands/:name",
       "streaming": "<sse|websocket|chunked>",
       "contentType": "<...>",
       "requestSchema": { "args": "string[]", "options": "object" }
     },
     "commands": [
       {
         "name": "<cli command name>",
         "endpoint": "<runner.path with :name substituted>",
         "spec": { "args": [...], "options": [...], "description": "...", "examples": [...] }
       }
     ],
     "artifacts": [
       { "name": "...", "method": "GET", "path": "/api/...", "kind": "list|read", "source": "..." }
     ]
   }
   ```

   Carry over `runner.method`, `runner.path`, `runner.streaming`, and `runner.contentType` verbatim from `runner-manifest.json`. Carry the full `cli-commands.json` per-command spec (`args`, `options`, `description`, `examples`) into each `commands[].spec`. Carry the full artifact route entries (`name`, `method`, `path`, `kind`, `source`) into `artifacts[]` verbatim.

3. Pre-resolve each per-command endpoint URL: take `runner.path` (e.g. `/api/commands/:name`) and substitute `:name` (or `{name}`) with the actual command name, so the frontend doesn't have to do template substitution at call time. Example: `/api/commands/:name` + name `plan` → `commands[].endpoint = "/api/commands/plan"`.

4. Sort `commands` alphabetically by `name` for stable diffs across reruns: `commands.sort((a,b) => a.name.localeCompare(b.name))`. Do NOT sort `artifacts` — preserve manifest order.

5. Write `endpoint-registry.json` to the task directory: `fs.writeFileSync('./endpoint-registry.json', JSON.stringify(registry, null, 2))`.

6. Sanity-check before exit (fail loudly if mismatched):
   - For every `cmd` in `cliCommands.commands`, assert there is a matching entry in `registry.commands`. Print missing names and exit non-zero if any are absent.
   - For every `route` in `artifacts.routes`, assert there is a matching entry in `registry.artifacts` (compare by `path`). Print missing paths and exit non-zero if any are absent.
   - Assert no `commands[].endpoint` still contains `:name` or `{name}` placeholders.

7. Run all checks declared in the frontmatter from the task working directory and confirm each exits 0 before reporting completion.
