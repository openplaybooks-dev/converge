---
title: Scaffold frontend package
outputs:
  - packages/mission-control-frontend/package.json
  - packages/mission-control-frontend/tsconfig.json
  - packages/mission-control-frontend/index.html
  - packages/mission-control-frontend/src/main.tsx
  - packages/mission-control-frontend/src/App.tsx
checks:
  - id: package-json-exists
    cmd: "test -s packages/mission-control-frontend/package.json"
    description: "package.json is present and non-empty"
  - id: package-json-shape
    cmd: "node -e \"const p=require('./packages/mission-control-frontend/package.json'); if(!p.name||!p.scripts||!p.scripts.dev||!p.scripts.build||!p.scripts.typecheck) process.exit(1)\""
    description: "package.json has name and scripts.dev/build/typecheck"
  - id: package-json-private
    cmd: "node -e \"const p=require('./packages/mission-control-frontend/package.json'); if(p.private!==true) process.exit(1)\""
    description: "package.json is marked private:true (workspace package)"
  - id: tsconfig-exists
    cmd: "test -s packages/mission-control-frontend/tsconfig.json"
    description: "tsconfig.json is present and non-empty"
  - id: tsconfig-valid-json
    cmd: "node -e \"const fs=require('fs'); const s=fs.readFileSync('packages/mission-control-frontend/tsconfig.json','utf8'); const stripped=s.replace(/\\\\/\\\\*[\\\\s\\\\S]*?\\\\*\\\\//g,'').replace(/^\\\\s*\\\\/\\\\/.*$/gm,''); JSON.parse(stripped)\""
    description: "tsconfig.json parses as JSON (after stripping comments)"
  - id: bundler-config-exists
    cmd: "ls packages/mission-control-frontend/vite.config.* packages/mission-control-frontend/webpack.config.* packages/mission-control-frontend/rspack.config.* 2>/dev/null | head -1 | grep -q ."
    description: "A bundler config file exists (vite/webpack/rspack)"
  - id: index-html-exists
    cmd: "test -s packages/mission-control-frontend/index.html"
    description: "index.html is present and non-empty"
  - id: index-html-has-root
    cmd: "grep -qE \"id=['\\\"]root['\\\"]\" packages/mission-control-frontend/index.html"
    description: "index.html contains a #root mount node"
  - id: main-entry-exists
    cmd: "test -s packages/mission-control-frontend/src/main.tsx"
    description: "src/main.tsx is present and non-empty"
  - id: app-component-exists
    cmd: "test -s packages/mission-control-frontend/src/App.tsx"
    description: "src/App.tsx is present and non-empty"
  - id: main-imports-app
    cmd: "grep -qE \"from +['\\\"]\\\\./App['\\\"]\" packages/mission-control-frontend/src/main.tsx"
    description: "main.tsx imports App from ./App"
---

# Scaffold frontend package

**Goal**: Create the frontend package directory with build/runtime config and an entry point that boots an empty app, per `ARCHITECTURE.md`.

## Scope

Read `ARCHITECTURE.md` to identify the package location, framework, and bundler. Create the package dir with `package.json` (name, scripts: `dev`, `build`, `typecheck`), `tsconfig.json`, bundler config (e.g. `vite.config.ts`), an `index.html` entry, and a minimal `src/main.tsx` (or framework equivalent) that mounts an empty `<App />`. Do NOT install dependencies or run the dev server here — declarative setup only. Add the package to the workspace's package manager config if the monorepo requires it.

### Inputs

- `ARCHITECTURE.md` — the architecture decision document produced by an upstream sibling. Identifies framework, bundler, package layout, and backend dev port.

### Outputs

- `packages/mission-control-frontend/package.json`
- `packages/mission-control-frontend/tsconfig.json`
- `packages/mission-control-frontend/index.html`
- `packages/mission-control-frontend/src/main.tsx`
- `packages/mission-control-frontend/src/App.tsx`
- A bundler config file (e.g. `packages/mission-control-frontend/vite.config.ts`)

### Constraints

- **Declarative setup only.** Do NOT run `npm install`, `pnpm install`, `yarn install`, or any dev server. The job is to write files.
- **Honor `ARCHITECTURE.md`.** If it mandates a different package path (e.g. `apps/mission-control-frontend`), write files there and note the path delta in your final summary so downstream siblings (`01-api-client`, `02-shared-ui`, `03-app-shell`, `04-router-registry`) can adjust their check paths.
- **Pre-existing collision.** If a frontend package already exists at the resolved path, STOP and report rather than overwrite — the user's in-progress work may be there.
- **No per-command logic.** This child only mounts an empty `<App />`. The placeholder `App.tsx` will be replaced by `03-app-shell`.

## Instructions

1. **Read `ARCHITECTURE.md`** at the repo root (or wherever the upstream architecture step wrote it). Locate the `## Stack`, `## Project Layout`, and `## Frontend` sections to extract:
   - **Package path** (default `packages/mission-control-frontend` if `ARCHITECTURE.md` is silent).
   - **Framework** (e.g. React / Solid / Vue).
   - **Bundler** (e.g. Vite / Rspack / Webpack).
   - **Language** (TypeScript assumed).
   - **Backend dev port** (for the dev proxy in step 5).
   If `ARCHITECTURE.md` does not exist or is silent on a required field, use the defaults named in this list and record the assumption in a TS comment near the relevant config line.

2. **Detect collisions.** Run `git ls-files packages/mission-control-frontend/ 2>/dev/null | head -1` (or equivalent for the resolved path). If any tracked file already exists, STOP — do not overwrite. Report the collision in the final summary so the user can decide.

3. **Create the package directory** at the resolved path using `mkdir -p <path>/src`. If the resolved path differs from `packages/mission-control-frontend`, write to the path `ARCHITECTURE.md` mandates AND record the delta in your final summary so downstream siblings update their check paths.

4. **Write `package.json`** with:
   - `"name": "@converge/mission-control-frontend"` (or the workspace's naming convention if different).
   - `"private": true` — required for workspace-only packages.
   - `"type": "module"`.
   - `"version": "0.0.0"`.
   - `"scripts": { "dev": "<bundler> dev", "build": "<bundler> build", "typecheck": "tsc --noEmit" }` — substitute the bundler binary chosen in step 1 (e.g. `vite`).
   - `"dependencies"` and `"devDependencies"` listing the framework runtime (e.g. `react`, `react-dom`), the framework-bundler plugin (e.g. `@vitejs/plugin-react`), the bundler (e.g. `vite`), and `typescript`. Pin to the major versions used elsewhere in the workspace if a root `package.json` reveals a convention; otherwise use sensible recent stable versions.
   - Use the **Write** tool.

5. **Write the bundler config** (e.g. `vite.config.ts`):
   - Import the framework plugin and pass it to `defineConfig({ plugins: [...] })`.
   - Set `server.port: 5173` (or another deterministic port).
   - Set `server.proxy: { '/api': 'http://localhost:<backend-port>' }` using the backend dev port from step 1, so the API client can use relative `/api` URLs.
   - Use the **Write** tool.

6. **Write `tsconfig.json`**:
   - If a workspace base TS config exists at the repo root (`tsconfig.base.json` or similar), `"extends"` it.
   - Otherwise write a strict standalone config: `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"strict": true`, `"jsx": "react-jsx"` (or framework equivalent), `"esModuleInterop": true`, `"skipLibCheck": true`, `"isolatedModules": true`, `"noEmit": true`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`.
   - `"include": ["src", "vite.config.ts"]`.
   - Use the **Write** tool.

7. **Write `index.html`** at the package root:
   - Standard HTML5 doctype.
   - `<title>Mission Control</title>`.
   - `<div id="root"></div>` inside `<body>`.
   - `<script type="module" src="/src/main.tsx"></script>` (path adjusts to bundler conventions).
   - Use the **Write** tool.

8. **Write `src/App.tsx`** as a minimal placeholder:
   ```tsx
   export default function App() {
     return <h1>Mission Control</h1>;
   }
   ```
   This will be replaced by `03-app-shell`. Use the **Write** tool.

9. **Write `src/main.tsx`** to mount `<App />`:
   - Import the framework's render entry point (e.g. `import { createRoot } from 'react-dom/client'`).
   - Import `App` from `./App`.
   - Look up `document.getElementById('root')`, create the root, and render `<App />`.
   - Use the **Write** tool.

10. **Wire the workspace.** Detect the package manager:
    - If a root `pnpm-workspace.yaml` exists, ensure its `packages:` glob covers the new package path. Edit with **Edit** if needed.
    - If the root `package.json` has a `"workspaces"` array (npm/yarn workspaces), append the new package path glob if not already covered. Edit with **Edit** if needed.
    - If neither exists, no workspace wiring is required — leave the package standalone.

11. **Run the checks** declared in the frontmatter to confirm every output exists and is well-formed. Do NOT run `npm install` or `npm run typecheck` — typecheck will fail until `01-api-client` / `03-app-shell` / `04-router-registry` land, and that staged failure is intentional per the plan.

12. **Final summary** to the user: report the resolved package path, framework, bundler, any deviations from defaults, and any path delta downstream siblings need to know about.

## Notes / gaps flagged from PLAN.md

- The plan's open questions list these unresolved ambiguities — surface any that bite during execution: (a) frontend package path may differ from `packages/mission-control-frontend/`; (b) framework choice is delegated to `ARCHITECTURE.md`; (c) pre-existing partial frontend package may collide; (d) `cli-commands.json` shape is not validated yet (does not affect this child but affects siblings).
