---
kind: container
children:
  - id: 00-spec
    kind: executable
    title: Write product spec
  - id: 01-scaffold
    kind: executable
    title: Scaffold project skeleton
  - id: 02-shared-types
    kind: executable
    title: Define shared TypeScript types
  - id: 03-backend
    kind: container
    title: Build REST API server
  - id: 04-frontend
    kind: container
    title: Build web UI
---

# Goal

Deliver a full-stack todo application: a REST API that persists todos and a browser UI that lets users create, list, toggle, and delete them.

# Decision

Container — this is a multi-artifact system spanning backend and frontend. Five children decompose the work into spec, scaffold, shared types, API server, and UI. The backend and frontend are themselves containers (each will decompose into routes/components downstream). The first three children are executables that produce the shared artifacts the containers consume.

# Children

## 00-spec — Write product spec
- **id**: 00-spec
- **kind**: executable
- **goal**: Produce a PRD that defines the todo app's features, data model, and acceptance criteria.
- **description**: Write a product requirements document covering the app's scope: what a todo item looks like (title, completed flag, created/updated timestamps), the CRUD operations users can perform, and the API surface (endpoints, request/response shapes). This serves as the north star for all downstream tasks — backend and frontend containers derive their contracts from it.
- **scope**: A single markdown file (PRD.md) with feature list, user stories, data model sketch, and API endpoint inventory.
- **inputs**: None — greenfield project.
- **dependencies**: None.
- **tags**: [spec, documentation]
- **outputs**:
  - PRD.md
- **checks**:
  - cmd: test -f PRD.md
  - cmd: grep -qE "## Features" PRD.md
  - cmd: grep -qE "## API" PRD.md
- **body**: |
    1. Create PRD.md at the project root.
    2. Write a `## Features` section listing core capabilities: create todo, list todos, toggle completion, delete todo.
    3. Write a `## Data Model` section defining a Todo item: `id` (string/uuid), `title` (string), `completed` (boolean), `createdAt` (ISO timestamp), `updatedAt` (ISO timestamp).
    4. Write a `## API` section specifying REST endpoints:
       - `GET /api/todos` — list all todos, returns `Todo[]`
       - `POST /api/todos` — create a todo, accepts `{ title: string }`, returns `Todo`
       - `PUT /api/todos/:id` — update a todo (toggle completed, edit title), accepts partial `Todo`, returns `Todo`
       - `DELETE /api/todos/:id` — delete a todo, returns `204`
    5. Write a `## User Stories` section with 4-5 short stories (e.g. "As a user I can add a new todo", "As a user I can mark a todo as done").
    6. Write a `## Non-Goals` section listing what is out of scope (auth, persistence beyond process lifetime, multi-user, due dates).

    ## Output schema
    ```
    (No JSON output — PRD.md is plain markdown)
    ```

## 01-scaffold — Scaffold project skeleton
- **id**: 01-scaffold
- **kind**: executable
- **goal**: Create the project's package.json, tsconfig.json, and directory layout.
- **description**: Bootstrap a TypeScript project with npm. Install dependencies needed by both backend and frontend: express for the server, React + Vite for the client, and shared devDependencies (typescript, @types packages). Create the top-level directory structure so downstream tasks have a home for their outputs.
- **scope**: package.json with scripts for dev, build, and start; tsconfig.json with strict mode; a `src/` directory with `shared/`, `server/`, and `client/` subdirectories.
- **inputs**:
  - PRD.md
- **dependencies**:
  - 00-spec
- **tags**: [scaffold, typescript]
- **outputs**:
  - package.json
  - tsconfig.json
  - src/shared/
  - src/server/
  - src/client/
- **checks**:
  - cmd: test -f package.json
  - cmd: test -f tsconfig.json
  - cmd: test -d src/shared
  - cmd: test -d src/server
  - cmd: test -d src/client
- **body**: |
    1. Run `npm init -y` to create package.json, then edit it to set `"type": "module"` and add scripts: `"dev"`, `"build"`, `"start"`.
    2. Install production dependencies: `npm install express`.
    3. Install devDependencies: `npm install -D typescript @types/node @types/express vite @vitejs/plugin-react react react-dom @types/react @types/react-dom`.
    4. Create tsconfig.json with `"strict": true`, `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"outDir": "./dist"`, `"rootDir": "./src"`.
    5. Create directory tree: `mkdir -p src/shared src/server src/client`.

    ## Output schema
    ```
    (No JSON output — standard config files)
    ```

## 02-shared-types — Define shared TypeScript types
- **id**: 02-shared-types
- **kind**: executable
- **goal**: Write the shared TypeScript interfaces that backend and frontend both import.
- **description**: Produce a single `types.ts` file with the `Todo` interface and any request/response types the API uses. This is the contract between server and client — the backend's route handlers and the frontend's API client both type-check against these definitions. Keeping types in a shared location prevents drift between the two sides.
- **scope**: One TypeScript file exporting `Todo`, `CreateTodoRequest`, and `UpdateTodoRequest` types.
- **inputs**:
  - PRD.md
- **dependencies**:
  - 00-spec
- **tags**: [typescript, schema, shared]
- **outputs**:
  - src/shared/types.ts
- **checks**:
  - cmd: test -f src/shared/types.ts
  - cmd: grep -qE "export interface Todo" src/shared/types.ts
  - cmd: grep -qE "export interface CreateTodoRequest" src/shared/types.ts
  - cmd: grep -qE "export interface UpdateTodoRequest" src/shared/types.ts
- **body**: |
    1. Create `src/shared/types.ts`.
    2. Export a `Todo` interface with fields: `id: string`, `title: string`, `completed: boolean`, `createdAt: string`, `updatedAt: string`.
    3. Export a `CreateTodoRequest` interface with `title: string`.
    4. Export an `UpdateTodoRequest` interface with optional `title?: string` and `completed?: boolean`.
    5. Re-read PRD.md to confirm the data model matches — adjust if the spec has extra fields.

    ## Output schema
    ```json
    {
      "Todo": {
        "id": "string",
        "title": "string",
        "completed": "boolean",
        "createdAt": "string (ISO 8601)",
        "updatedAt": "string (ISO 8601)"
      },
      "CreateTodoRequest": {
        "title": "string"
      },
      "UpdateTodoRequest": {
        "title": "string (optional)",
        "completed": "boolean (optional)"
      }
    }
    ```

    ## Example
    ```ts
    export interface Todo {
      id: string;
      title: string;
      completed: boolean;
      createdAt: string;
      updatedAt: string;
    }

    export interface CreateTodoRequest {
      title: string;
    }

    export interface UpdateTodoRequest {
      title?: string;
      completed?: boolean;
    }
    ```

## 03-backend — Build REST API server
- **id**: 03-backend
- **kind**: container
- **goal**: Build an Express server that serves the todo REST API and static frontend assets.
- **description**: A container that will decompose into Express app setup, route handlers for the four CRUD endpoints, and an in-memory storage module. The server reads and writes todos as JSON, serves the API at `/api/todos`, and in production also serves the built frontend from `dist/client/`. Decomposition will follow the route-per-executable pattern — one executable per endpoint plus one for server bootstrap and one for storage.
- **scope**: Express application with middleware (JSON parsing, CORS), route modules for GET/POST/PUT/DELETE `/api/todos`, an in-memory store with uuid generation, and a production static-file fallback.
- **inputs**:
  - PRD.md
  - package.json
  - tsconfig.json
  - src/shared/types.ts
- **dependencies**:
  - 01-scaffold
  - 02-shared-types
- **tags**: [backend, express, api]

## 04-frontend — Build web UI
- **id**: 04-frontend
- **kind**: container
- **goal**: Build a React + Vite single-page app for managing todos in the browser.
- **description**: A container that will decompose into React components (TodoList, TodoItem, AddTodoForm), an API client module that calls the backend endpoints, and Vite configuration. The UI lets users see all todos, add new ones, toggle completion with a checkbox, and delete items. The decomposition will follow a component-per-executable pattern plus one executable for the Vite entry point and one for the API client.
- **scope**: Vite + React project under `src/client/` with an `index.html`, `main.tsx` entry point, App component orchestrating child components, an `api.ts` client module wrapping fetch calls to `/api/todos`, and individual components for the todo list, todo item row, and add-todo form.
- **inputs**:
  - PRD.md
  - package.json
  - tsconfig.json
  - src/shared/types.ts
- **dependencies**:
  - 01-scaffold
  - 02-shared-types
- **tags**: [frontend, react, vite]

# Open questions

- What tech stack does the user prefer? Assumed TypeScript + Express + React + Vite as a reasonable default for a greenfield full-stack todo app. If the user wants a different stack (e.g. Next.js, Vue, Bun, Go), the scaffold and container descriptions would shift.
- Should the backend persist todos to disk or a database, or is in-memory acceptable? Assumed in-memory storage for simplicity — a production todo app would want SQLite or Postgres, but that adds infrastructure complexity not implied by "build a todo app."
- Is there a pre-existing codebase this should integrate into? Assumed greenfield since no existing source files were referenced in the scope packet.
