---
kind: container
children:
  - id: 00-scaffold
    kind: executable
    title: Project scaffold
  - id: 01-backend
    kind: container
    title: Backend API server
  - id: 02-frontend
    kind: container
    title: Frontend UI
  - id: 03-integrate
    kind: executable
    title: Integration and verification
---

# Goal

Build a full-stack todo web application with a TypeScript Express backend
and a React frontend. Users can create, list, toggle, and delete todos.
Storage is file-based JSON (no database setup required). The dev server
proxies API calls so the full app runs with a single `npm run dev`.

# Decision

CONTAINER. Four children ordered by dependency: scaffold → backend + frontend
(in parallel) → integration. Backend and frontend are containers because each
decomposes into 2-4 sub-concerns (storage, routes, server entrypoint for
backend; components, app shell, API client for frontend). No fan-out at the
root — the shape is small and static.

# Children

## 00-scaffold — Project scaffold
- **id**: 00-scaffold
- **kind**: executable
- **goal**: Create the project skeleton with package.json, TypeScript configs, and Vite config.
- **description**: Initializes a monorepo-style project with `server/` and `client/` directories.
  Installs all runtime and dev dependencies (Express, React, Vite, TypeScript). The scaffold
  produces the config files that both backend and frontend containers extend — neither container
  should invent its own package manager or build tooling.
- **scope**: Single leaf task — create four config files and run npm install. No code generation
  beyond config scaffolding.
- **inputs**: (none — this is the root task)
- **dependencies**: (none)
- **tags**: [scaffold, config, typescript]
- **outputs**:
  - `package.json`
  - `tsconfig.json`
  - `server/tsconfig.json`
  - `client/tsconfig.json`
  - `client/vite.config.ts`
- **checks**:
  - cmd: test -f package.json
  - cmd: test -f tsconfig.json
  - cmd: test -f server/tsconfig.json
  - cmd: test -f client/vite.config.ts
  - cmd: node -e "const p=require('./package.json'); if(!p.dependencies?.express) process.exit(1)"
  - cmd: node -e "const p=require('./package.json'); if(!p.dependencies?.react) process.exit(1)"
- **body**: |
    1. Create root `package.json` with:
       - `"name": "todo-app"`, version, private: true
       - `scripts`: `dev` (concurrently runs server + client), `dev:server` (tsx watch),
         `dev:client` (vite), `build` (tsc + vite build)
       - `dependencies`: express, cors, react, react-dom
       - `devDependencies`: typescript, tsx, vite, @vitejs/plugin-react, concurrently,
         @types/express, @types/cors, @types/react, @types/react-dom
    2. Create root `tsconfig.json` with strict mode, ES2020 target, moduleResolution: bundler.
    3. Create `server/tsconfig.json` extending root, with `outDir: ./dist`, `rootDir: ./src`,
       `module: commonjs` or `esnext`.
    4. Create `client/tsconfig.json` extending root, with `jsx: react-jsx`, `outDir: ./dist`.
    5. Create `client/vite.config.ts` with the React plugin. (Proxy config comes later in
       03-integrate.)
    6. Run `npm install`.

    ## Output schema
    ```json
    {
      "name": "<string>",
      "version": "1.0.0",
      "private": true,
      "scripts": { "<key>": "<command>" },
      "dependencies": { "<package>": "<semver>" },
      "devDependencies": { "<package>": "<semver>" }
    }
    ```

    ## Example
    ```json
    {
      "name": "todo-app",
      "version": "1.0.0",
      "private": true,
      "scripts": {
        "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
        "dev:server": "tsx watch server/src/index.ts",
        "dev:client": "vite --config client/vite.config.ts",
        "build": "tsc -p server/tsconfig.json && vite build --config client/vite.config.ts"
      },
      "dependencies": {
        "express": "^4.18.0",
        "cors": "^2.8.5",
        "react": "^18.3.0",
        "react-dom": "^18.3.0"
      },
      "devDependencies": {
        "typescript": "^5.4.0",
        "tsx": "^4.7.0",
        "vite": "^5.2.0",
        "@vitejs/plugin-react": "^4.2.0",
        "concurrently": "^8.2.0",
        "@types/express": "^4.17.0",
        "@types/cors": "^2.8.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0"
      }
    }
    ```

## 01-backend — Backend API server
- **id**: 01-backend
- **kind**: container
- **goal**: Deliver an Express server with CRUD endpoints for todos backed by file-based JSON storage.
- **description**: The backend is a self-contained Express server that reads and writes todos to a
  local JSON file. It exposes REST endpoints: `GET /api/todos` (list), `POST /api/todos` (create),
  `PUT /api/todos/:id` (update), `DELETE /api/todos/:id` (delete). Each todo has an `id`, `title`,
  `completed` status, and `createdAt` timestamp. The server runs on port 3001 and enables CORS for
  the Vite dev server origin. Decomposes into storage layer, route handlers, and server entrypoint.
- **scope**: Container with 2-3 executable children: a storage module (`server/src/storage.ts`), a
  routes module (`server/src/routes.ts`), and a server entrypoint (`server/src/index.ts`). The
  per-layer planner decides whether to split routes from entrypoint or combine them.
- **inputs**:
  - `package.json` (from 00-scaffold)
  - `server/tsconfig.json` (from 00-scaffold)
- **dependencies**: [00-scaffold]
- **tags**: [backend, api, express]

## 02-frontend — Frontend UI
- **id**: 02-frontend
- **kind**: container
- **goal**: Deliver a React SPA that lets users view, add, toggle, and delete todos.
- **description**: A single-page React app with a clean todo list UI. Components: a `TodoList` that
  fetches and displays todos, a `TodoForm` for adding new todos, and a `TodoItem` for each row with
  toggle and delete buttons. State is managed with `useState` + `useEffect` calling the backend API.
  Styled with minimal CSS (no framework — keeps the leaf surface small). Decomposes into components
  and the app shell.
- **scope**: Container with 2-3 executable children: an API client/hooks module, the component tree
  (`TodoList`, `TodoForm`, `TodoItem`), and the `App` shell with basic layout. The per-layer planner
  decides the split.
- **inputs**:
  - `package.json` (from 00-scaffold)
  - `client/tsconfig.json` (from 00-scaffold)
  - `client/vite.config.ts` (from 00-scaffold)
- **dependencies**: [00-scaffold]
- **tags**: [frontend, react, ui]

## 03-integrate — Integration and verification
- **id**: 03-integrate
- **kind**: executable
- **goal**: Wire the frontend dev server to proxy API calls to the backend, add the combined dev script, and verify the full stack works.
- **description**: Configures the Vite dev server to proxy `/api` requests to the Express backend
  on port 3001. Adds or verifies the root `package.json` `dev` script that starts both servers
  concurrently. Adds a `start` script entry that builds and serves. Verifies the app starts and the
  API round-trips a todo (create, list, toggle, delete).
- **scope**: Single leaf task — update Vite config with proxy settings, ensure scripts in
  package.json are correct, verify end-to-end.
- **inputs**:
  - `package.json` (from 00-scaffold)
  - `client/vite.config.ts` (from 00-scaffold)
  - `server/src/index.ts` (from 01-backend)
  - `client/src/App.tsx` (from 02-frontend)
- **dependencies**: [01-backend, 02-frontend]
- **tags**: [integration, config, verification]
- **outputs**:
  - `client/vite.config.ts` (updated with proxy)
  - `package.json` (updated with dev/start scripts)
- **checks**:
  - cmd: grep -qE "proxy.*3001" client/vite.config.ts
  - cmd: node -e "const p=require('./package.json'); if(!p.scripts?.dev) process.exit(1)"
  - cmd: node -e "const p=require('./package.json'); if(!p.scripts?.start) process.exit(1)"
- **body**: |
    1. Read `client/vite.config.ts`. Add a `server.proxy` block that forwards `/api` requests to
       `http://localhost:3001`. Preserve existing config.
    2. Read `package.json`. Ensure `scripts.dev` runs server and client concurrently (e.g.
       `concurrently "npm run dev:server" "npm run dev:client"`). Add `scripts.start` that builds
       the client and starts the server.
    3. Verify by starting the app: `npm run dev` should serve the React app on port 5173 and proxy
       `/api/todos` to port 3001.
    4. Smoke test: `curl -X POST localhost:3001/api/todos -H 'Content-Type: application/json' -d
       '{"title":"test"}'` returns 201; `curl localhost:3001/api/todos` includes the new todo.

# Open questions

- **Tech stack defaults.** This plan assumes Express + React + Vite + file-based JSON storage.
  If the user wants a different stack (Next.js, Fastify, SQLite, etc.), the scaffold and backend
  containers need adjustment. The plan does not ask because "build a todo app" is unambiguous
  enough to proceed with sensible defaults — the user can reject and redirect if needed.
- **Project location.** The outputs assume the playbook's working directory is the project root
  (i.e., files like `package.json` are at `.`). If the user wants the todo app scaffolded into a
  subdirectory, the paths need a prefix.
- **Testing.** No test framework is scaffolded. If the user wants Vitest or Jest wired in, that
  should be a child of 00-scaffold or a follow-up playbook.
- **Persistence durability.** File-based JSON storage (`server/data/todos.json`) is simple but
  loses data if the file is deleted. A production app would use SQLite or Postgres. This is
  explicitly a demo-scope choice — surfaced so the user can upgrade it.
