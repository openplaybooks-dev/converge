---
title: Read endpoints for journal, playbooks, and artifacts
outputs:
  - artifacts-manifest.json
  - "<packagePath>/src/routes/ (route files for journal, playbooks, and any other artifact domains from ARCHITECTURE.md)"
checks:
  - id: manifest-exists
    cmd: test -s artifacts-manifest.json
    description: artifacts-manifest.json exists in the task directory and is non-empty
  - id: manifest-valid-json
    cmd: node -e "JSON.parse(require('fs').readFileSync('./artifacts-manifest.json','utf8'))"
    description: artifacts-manifest.json is valid JSON
  - id: manifest-shape
    cmd: node -e "const m=require('./artifacts-manifest.json'); if(!Array.isArray(m.routes)||m.routes.length<2) process.exit(1); for(const r of m.routes){for(const k of ['name','method','path','kind','source']) if(!r[k]) process.exit(1); if(!['list','read'].includes(r.kind)) process.exit(1); if(!r.path.startsWith('/api/')) process.exit(1)}"
    description: routes is an array of >=2 entries; each has name/method/path/kind/source; kind is list|read; path starts with /api/
  - id: covers-required-domains
    cmd: node -e "const m=require('./artifacts-manifest.json'); const names=new Set(m.routes.map(r=>r.name.toLowerCase())); for(const need of ['journal','playbook']) if(![...names].some(n=>n.includes(need))) process.exit(1)"
    description: manifest registers at least one journal route and one playbook route
  - id: source-files-exist
    cmd: node -e "const s=require('../00-scaffold/scaffold-manifest.json'),fs=require('fs'),p=require('path'); const dir=p.join('..','..','..','..','..','..',s.packagePath,'src'); const files=fs.readdirSync(dir,{recursive:true}).filter(f=>String(f).endsWith('.ts')||String(f).endsWith('.js')); const blob=files.map(f=>fs.readFileSync(p.join(dir,String(f)),'utf8')).join('\n'); if(!blob.includes('journal')||!blob.includes('playbook')) process.exit(1)"
    description: scaffolded package source mentions both 'journal' and 'playbook' (routes are wired in)
  - id: scaffold-manifest-required
    cmd: test -s ../00-scaffold/scaffold-manifest.json
    description: sibling scaffold-manifest.json must exist (sequencing gate — 00-scaffold ran first)
---

# Read endpoints for journal, playbooks, and artifacts

**Goal**: Expose the on-disk artifacts mission control needs to render its monitoring/browse views — journal entries, playbook tree, and any other read targets ARCHITECTURE.md flags — as JSON read endpoints.

## Scope

Implement read-only endpoints over the `.converge/journal/`, `.converge/playbooks/`, and `.converge/logs/` directory trees (or whatever set ARCHITECTURE.md prescribes). Endpoints should list directory contents and return file contents (with safe path normalization, no traversal). Mount on the server from `00-scaffold`. Publish `artifacts-manifest.json` listing each registered route so `03-endpoint-registry` can include them.

**Inputs**:
- `ARCHITECTURE.md` (sibling at `../../ARCHITECTURE.md` if produced by another sibling chain, or at the parent's expected location — resolve from PLAN.md)
- `../00-scaffold/scaffold-manifest.json` — gives `packagePath`, `entryFile`, `framework`

**Outputs**:
- `artifacts-manifest.json` (this task directory) with shape `{ routes: [{ name, method, path, kind: "list"|"read", source }] }`
- Route source files under `<packagePath>/src/routes/` (e.g. `journal.ts`, `playbooks.ts`, plus any extras from ARCHITECTURE.md)
- Server entry from `00-scaffold` is extended to register these new routes — do NOT spin up a parallel server.

## Instructions

1. **Locate the scaffold + architecture inputs.** Read `../00-scaffold/scaffold-manifest.json` to extract `packagePath`, `entryFile`, and `framework`. Read `ARCHITECTURE.md` (resolve its path the same way `00-scaffold` did — it is referenced directly in PLAN.md) to extract: the artifact set to expose, workspace-resolution rules (single cwd vs configurable workspace root via env/config), and any error-shape conventions. If ARCHITECTURE.md says nothing about extra artifacts beyond journal+playbooks, default to the minimum set listed below + `.converge/logs/`.

2. **Implement `safeJoin(root, relPath)`** in a helper module under `<packagePath>/src/lib/safe-join.<ts|js>` (extension matches the scaffold's language). Behaviour:
   - Reject `relPath` that is absolute (`path.isAbsolute(relPath)`).
   - Resolve the candidate via `path.resolve(root, relPath)` and reject if it does not start with `path.resolve(root) + path.sep` (or equals `path.resolve(root)`).
   - Throw a typed error (e.g. `class TraversalError extends Error`) so route handlers can map it to HTTP 400.

3. **Implement the route handlers.** Create at least these files under `<packagePath>/src/routes/` using the `framework` chosen by `00-scaffold`:

   - `journal.<ts|js>`:
     - `GET /api/journal` — recursive directory walk under `.converge/journal/`. Return `{ entries: [{ path, kind: 'file'|'dir', size, mtime }] }` where `path` is relative to the journal root.
     - `GET /api/journal/*` — read a single journal file via `safeJoin('.converge/journal', wildcard)`. Return `{ path, content }`. Set content-type by extension (`.json` → JSON-parsed in `content`; everything else → string).
   - `playbooks.<ts|js>`:
     - `GET /api/playbooks` — list playbooks under `.converge/playbooks/` (top-level entries + their structure as the framework's directory walk supports — keep it depth-1 for the list endpoint).
     - `GET /api/playbooks/*` — read a playbook file or, if the path resolves to a directory, return `{ path, entries: [...] }` (same shape as the list endpoint).
   - Any additional route file ARCHITECTURE.md mandates (e.g. `logs.<ts|js>` for `GET /api/logs` + `GET /api/logs/*` over `.converge/logs/`). If ARCHITECTURE.md is silent, still add a `logs` route — it is cheap and the registry consumer expects it.

4. **Standardise the response shape.**
   - List endpoints: `{ entries: [...] }`.
   - Read endpoints: `{ path: string, content: <string|object> }`.
   - 404 (`{ error: { code: 'NOT_FOUND', path } }`) when the resolved file/dir does not exist.
   - 400 (`{ error: { code: 'TRAVERSAL', path } }`) when `safeJoin` rejects.
   - 500 (`{ error: { code: 'READ_FAILED', message } }`) on any other read error.
   Use the same error shape across every route in this task so the frontend can branch on `error.code`.

5. **Register the routes on the existing server.** Open `<packagePath>/<entryFile>` (from `scaffold-manifest.json`). Import each new route module and mount it on the existing app using whatever pattern the framework uses (`app.use(...)`, `app.route(...)`, plugin registration, etc.). Do NOT instantiate a new server. Keep imports relative to the entry file.

6. **Write `artifacts-manifest.json`** to this task directory (`D:\converge\.converge\playbooks\careate-a-new-playbook-to-implement-mission-contro\03-backend\02-artifact-routes\artifacts-manifest.json`) using the `Write` tool. Shape:
   ```json
   {
     "routes": [
       { "name": "journal-list",     "method": "GET", "path": "/api/journal",       "kind": "list", "source": ".converge/journal" },
       { "name": "journal-read",     "method": "GET", "path": "/api/journal/*",     "kind": "read", "source": ".converge/journal" },
       { "name": "playbooks-list",   "method": "GET", "path": "/api/playbooks",     "kind": "list", "source": ".converge/playbooks" },
       { "name": "playbooks-read",   "method": "GET", "path": "/api/playbooks/*",   "kind": "read", "source": ".converge/playbooks" },
       { "name": "logs-list",        "method": "GET", "path": "/api/logs",          "kind": "list", "source": ".converge/logs" },
       { "name": "logs-read",        "method": "GET", "path": "/api/logs/*",        "kind": "read", "source": ".converge/logs" }
     ]
   }
   ```
   - Add/remove rows so the manifest exactly matches what you registered in step 5. Every route mounted in code must appear here; nothing extra.
   - Names should be unique and lowercase-kebab.

7. **Self-verify locally before declaring done.**
   - Run each check from this file's frontmatter and confirm exit 0.
   - Visually inspect that `artifacts-manifest.json` lists at least one `journal*` route and one `playbook*` route, and that every `path` starts with `/api/`.
   - Grep the package source to confirm the strings `journal` and `playbook` appear (the `source-files-exist` check enforces this).

## Notes / gaps from PLAN.md

- `artifact-count-matches` in the sibling `03-endpoint-registry` checks that this manifest's `routes.length` equals `endpoint-registry.json`'s `artifacts.length`. That sibling consumes whatever you register here verbatim — keep entries minimal and correct rather than padding.
- ARCHITECTURE.md may name additional artifact roots (e.g. `.converge/state/`, custom workspace dirs). If so, add them to both the routes and the manifest before writing.
- Workspace scope is single-cwd for v1 per PLAN.md open-questions; do NOT add a `?workspace=` parameter unless ARCHITECTURE.md mandates it.
