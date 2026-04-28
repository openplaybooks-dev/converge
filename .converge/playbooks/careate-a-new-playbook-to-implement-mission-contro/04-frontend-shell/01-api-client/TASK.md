---
title: API client module
outputs:
  - packages/mission-control-frontend/src/api/client.ts
  - packages/mission-control-frontend/src/api/types.ts
checks:
  - id: client-exists
    cmd: "test -s packages/mission-control-frontend/src/api/client.ts"
    description: client.ts exists and is non-empty
  - id: client-exports
    cmd: "grep -qE \"export +(async +)?function +runCommand\" packages/mission-control-frontend/src/api/client.ts"
    description: client.ts exports a runCommand function
  - id: stream-handler
    cmd: "grep -qE \"onChunk|EventSource|WebSocket|ReadableStream\" packages/mission-control-frontend/src/api/client.ts"
    description: client.ts wires a streaming transport for command output
  - id: types-exists
    cmd: "test -s packages/mission-control-frontend/src/api/types.ts"
    description: types.ts exists and is non-empty
  - id: get-helper
    cmd: "grep -qE \"export +(async +)?function +get\\b|export +const +get\\b\" packages/mission-control-frontend/src/api/client.ts"
    description: client.ts exports a typed get helper for read endpoints
  - id: abort-controller
    cmd: "grep -q \"AbortController\" packages/mission-control-frontend/src/api/client.ts"
    description: client.ts wires AbortController so callers can cancel a running command
  - id: types-shapes
    cmd: "grep -qE \"RunCommandRequest\" packages/mission-control-frontend/src/api/types.ts && grep -qE \"RunCommandResponse\" packages/mission-control-frontend/src/api/types.ts && grep -qE \"CommandChunk\" packages/mission-control-frontend/src/api/types.ts"
    description: types.ts declares RunCommandRequest, RunCommandResponse, and CommandChunk
---

# API client module

**Goal**: Provide a typed client that the per-command views and the shell can use to call the backend, including streaming command output.

## Scope

Build `src/api/client.ts` with a generic `runCommand(name, args, options, { onChunk })` that opens the streaming transport `ARCHITECTURE.md` chose (SSE / WebSocket / polling) plus typed read helpers (`listJournals`, `listPlaybooks`, etc., as a thin pass-through `get(path)`). The client must be agnostic to specific commands — per-command logic lives in `05-command-views`. Export TS types for the request/response shapes shared with the backend.

**Inputs**:
- `ARCHITECTURE.md`
- `packages/mission-control-frontend/package.json`

**Outputs**:
- `packages/mission-control-frontend/src/api/client.ts`
- `packages/mission-control-frontend/src/api/types.ts`

**Hard constraints**:
- Do NOT import `cli-commands.json` here — the client is generic; per-command callers pass `name` themselves.
- The client must be agnostic to specific commands.
- Wire `AbortController` so callers can cancel a running command.

## Instructions

1. **Read `ARCHITECTURE.md`** at the repo root. Locate the `## Streaming` and `## Backend` sections to identify:
   - The streaming transport (SSE / WebSocket / chunked HTTP / polling).
   - The endpoint convention (e.g. `POST /api/commands/:name`).
   - Any base path / prefix the backend mounts under.
   If `ARCHITECTURE.md` is silent on a field, document the assumption in a TS comment in the relevant file.

2. **Read `packages/mission-control-frontend/package.json`** to confirm the package exists (produced by sibling `00-scaffold`) and to learn what dev dependencies are available (e.g. whether `eventsource` polyfill or `ws` is declared). The client must compile against the deps the scaffold declared — if a transport requires a dep that is not present, add it to `package.json` `dependencies`.

3. **Create the directory** `packages/mission-control-frontend/src/api/` (use `mkdir -p`).

4. **Write `packages/mission-control-frontend/src/api/types.ts`** exporting at minimum:
   - `RunCommandRequest` — `{ name: string; args: string[]; options?: Record<string, unknown> }`.
   - `RunCommandResponse` — `{ exitCode: number; durationMs: number; error?: string }` (final outcome of the run).
   - `CommandChunk` — `{ stream: 'stdout' | 'stderr'; line: string; timestampMs: number }` (one streamed line).
   - `Result<T>` — a discriminated union for read endpoints, e.g. `{ ok: true; data: T } | { ok: false; error: string }`.
   Keep these aligned with what `03-backend` exposes; if `ARCHITECTURE.md` is silent on a field, add a TS `// ASSUMPTION:` comment naming what you assumed.

5. **Write `packages/mission-control-frontend/src/api/client.ts`** exporting:
   - A `baseUrl` resolver: read `import.meta.env.VITE_MISSION_CONTROL_API` and fall back to relative `/api` (the dev proxy in `00-scaffold` forwards it).
   - `export async function get<T>(path: string, init?: RequestInit): Promise<T>` — thin typed `fetch` wrapper that throws on non-2xx.
   - `export async function post<T>(path: string, body: unknown, init?: RequestInit): Promise<T>` — thin typed `fetch` wrapper, `Content-Type: application/json`, throws on non-2xx.
   - `export async function runCommand(name: string, args: string[], options: Record<string, unknown> | undefined, callbacks: { onChunk?: (chunk: CommandChunk) => void; signal?: AbortSignal }): Promise<RunCommandResponse>`.
     - POST to the run endpoint chosen in step 1 (e.g. `POST {baseUrl}/commands/:name`) with `RunCommandRequest` body.
     - Open the streaming transport from `ARCHITECTURE.md`:
       - **SSE**: open an `EventSource` on a session URL returned by the POST, parse each `message` event as `CommandChunk` JSON, call `onChunk(chunk)`. Close on a final `done` event whose `data` is `RunCommandResponse`.
       - **WebSocket**: open a `WebSocket` on the session URL, handle `message` events the same way.
       - **Chunked HTTP / ReadableStream**: read `response.body` as a `ReadableStream`, decode lines with `TextDecoder`, parse each as `CommandChunk` JSON, call `onChunk(chunk)`. The last line is `RunCommandResponse`.
       - **Polling**: poll a `GET {baseUrl}/commands/:sessionId/chunks?since=:cursor` loop until the server returns `done: true`.
     - Wire `callbacks.signal` to abort the underlying transport (close the `EventSource` / `WebSocket` / call `controller.abort()` for `fetch`-based transports). If the caller does not pass `signal`, create an internal `AbortController` so the function still cleans up on error.
     - Resolve with the final `RunCommandResponse`. Reject if the transport errors before completion.
   - Do NOT import `cli-commands.json`. The client takes `name` as a string parameter.

6. **Type-check the file** if a `typecheck` script exists in the package: from the repo root run `npx tsc --noEmit -p packages/mission-control-frontend/tsconfig.json` (do not block on errors caused by other unfinished children — only this child's two files must compile cleanly given their imports).

7. **Verify all checks** declared in the frontmatter pass before reporting done:
   - `test -s packages/mission-control-frontend/src/api/client.ts`
   - `test -s packages/mission-control-frontend/src/api/types.ts`
   - `grep -qE "export +(async +)?function +runCommand" packages/mission-control-frontend/src/api/client.ts`
   - `grep -qE "onChunk|EventSource|WebSocket|ReadableStream" packages/mission-control-frontend/src/api/client.ts`
   - `grep -qE "export +(async +)?function +get\b|export +const +get\b" packages/mission-control-frontend/src/api/client.ts`
   - `grep -q "AbortController" packages/mission-control-frontend/src/api/client.ts`
   - `grep -qE "RunCommandRequest" packages/mission-control-frontend/src/api/types.ts && grep -qE "RunCommandResponse" packages/mission-control-frontend/src/api/types.ts && grep -qE "CommandChunk" packages/mission-control-frontend/src/api/types.ts`

## Notes / open questions inherited from PLAN.md

- **Frontend package path.** The PLAN assumes `packages/mission-control-frontend/`. If `ARCHITECTURE.md` chose a different location, the paths in `outputs:` and every check above are wrong by that delta — write to whatever path `ARCHITECTURE.md` mandates and update the paths accordingly.
- **Streaming transport choice.** The exact transport (SSE / WebSocket / chunked HTTP / polling) is decided by `ARCHITECTURE.md`. The `runCommand` shape above is the same regardless of transport, but the implementation branch changes; commit to one based on what you read in step 1, and leave a comment naming it.
