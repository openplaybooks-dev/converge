---
status: rejected
author: Luc Van Minh
created: 2026-05-23
---

## RFC 0044: Studio Server Lifecycle and Resume Robustness

**Rejected (2026-05-29):** the underlying issue — the CLI spawning a Studio handoff HTTP server and tests racing against its port — was solved by removing the embedded server entirely. The CLI no longer spawns or knows about any UI server; both the `converge review` CLI and the Studio's POST endpoint write directly to `inventory/<playbook>/reports/<taskId>.jsonl` via `appendHumanReview()`, and the runner polls those files in-process. See the "Human review verdicts" section in `CLAUDE.md §7.1` and `tests/review-flow.test.ts`.

## RFC 0044 (original problem statement, kept for history)

## Problem

The studio server lifecycle has two reliability issues that cause test failures and can cause production hangs:

### 1. `ensureHumanReviewStudioServer` reuses dead servers

When a CLI run completes (or is cancelled), the studio server process exits but `studio-server.json` is not deleted. On a subsequent `--resume` run, `ensureHumanReviewStudioServer` reads the stale state file and returns `null` without verifying the server is still running.

```typescript
// commands-run.ts:339-348
async function ensureHumanReviewStudioServer(projectDir: string) {
  const current = await readStudioServerState(projectDir);
  if (current) return null; // ← blindly trusts stale state
  return await createAddStudioServer({ ... });
}
```

The result: a new CLI run prints URLs pointing to a dead server at `PORT_A`. The kernel holds `PORT_A` for ~60s after the process exits (TIME_WAIT), so the address appears valid in the state file. The CLI never detects the mismatch.

### 2. No live-port probe before announcing review URLs

When a task blocks for human review, `announceHumanReviewUrl` constructs the review URL from `studio-server.json` without verifying the server is listening. If the server died between runs, the printed URL is unreachable.

### 3. SIGINT → studio server race in tests

Tests kill r1's CLI with SIGKILL in `afterEach`. The studio server (which runs in the same process as the CLI coordinator) exits within ~200ms. But the test immediately spawns r2 which may read r1's stale state before the kernel releases the port. This causes r2 to print URLs to a port that's not yet accepting connections, with no way for the test to distinguish "server starting" from "server never started."

## Proposed Solution

Add a live-port probe to `ensureHumanReviewStudioServer`. When `studio-server.json` exists, probe the port before returning `null`. If the probe fails, delete the stale state file and create a fresh server.

### Changes

#### `packages/cli/src/commands-run.ts` — `ensureHumanReviewStudioServer`

```typescript
import { isPortOpen } from "@openplaybooks/converge-studio/server";

async function ensureHumanReviewStudioServer(projectDir: string) {
  const { createAddStudioServer } = await import("@openplaybooks/converge-studio");
  const current = await readStudioServerState(projectDir);
  if (!current) return await createAddStudioServer({ projectDir, port: 0, openBrowser: false });

  // State file exists. Verify the server is actually listening.
  // If the server died, isPortOpen will fail and we fall through to create a new one.
  const live = await isPortOpen(current.host, current.port);
  if (!live) {
    // Stale state — delete it and start fresh
    const statePath = join(projectDir, ".converge", "ui", "studio-server.json");
    try { await rm(statePath, { force: true }); } catch { /* best effort */ }
    return await createAddStudioServer({ projectDir, port: 0, openBrowser: false });
  }

  return null; // Server is live — reuse it
}
```

#### `packages/studio/src/html-server-manager.ts` — export `isPortOpen`

`isPortOpen` is already implemented as a private helper. Export it so `commands-run.ts` can use it:

```typescript
// html-server-manager.ts
export async function isPortOpen(host: string, port: number): Promise<boolean> {
  // ... existing implementation
}
```

## Alternatives Considered

### 1. PID-based server reuse with process liveness check

Store `pid` in `studio-server.json` and check `process.kill(pid, 0)` before reusing. Rejected because Windows doesn't support this signal-based probe and the existing `isPortOpen` TCP probe already handles cross-platform.

### 2. Delete `studio-server.json` on SIGINT

Register a SIGINT handler in `createAddStudioServer` to delete the state file on shutdown. Rejected because SIGKILL (which tests use) bypasses all handlers, and a slow server shutdown could still race with the next run.

### 3. Probe in `announceHumanReviewUrl` instead

Probe the server when constructing the review URL rather than when starting the server. Rejected because this would add latency to every human review announcement and doesn't fix the underlying stale state problem.

## Migration Path

- `ensureHumanReviewStudioServer` is called from `runAutonomousCommand` in the CLI coordinator — no changes to task execution flow
- State file deletion is already guarded with `force: true` — safe if file was already deleted
- No changes to `playbook.yml` or `TASK.md` schemas
- Fully backward-compatible: existing live servers are unchanged

## Verification Criteria

1. Sequential test run: r1 exits → r2 resumes with `--resume` → r2's studio server starts on a fresh port → POST to r2's URL succeeds
2. Kill r1 with SIGINT → studio server exits → r2 sees stale state → probes port → deletes state → starts fresh server → POST succeeds
3. No pre-existing test failures introduced

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written |
| `isPortOpen` export from `html-server-manager.ts` | **done** | Exported from studio package; added port > 65535 validation |
| `ensureHumanReviewStudioServer` live probe | **done** | Core fix implemented and tested |
| `pnpm build` | **done** | TypeScript + DTS clean |
| Pre-existing failures | **done** | None introduced — all 6 RFC 0044 tests pass |