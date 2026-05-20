---
rfc: 0003
title: Three-tier error classification + retry policies
status: draft
type: fix
source: human
priority_tier: tier1
estimate: "4-5 days"
backwards_compatible: yes
risk: medium
---
# RFC 0003: Three-tier error classification + retry policies

## Problem

In `examples/baby-app`'s run, the seed agent for `03-build-screens` failed with:

```
seed failed: claudefn idle-timed out after 600000ms of inactivity
```

The runtime classified this as `transient/remote` and **gave up**:

```
🔧 Triggering self-healing...
   → Skipping AI repair: transient/remote error
```

The task was then marked **failed**, blocking all downstream work. The whole run stalled. Recovery required: `pkill`, `converge reset`, `converge run --resume`.

This is the worst of both worlds:
- It's a transient error (the API was just slow/hung), so the task should retry.
- It got the "transient" label, so the repair agent was skipped (correct — repair won't help a slow API).
- But the runtime didn't *also* retry — it failed permanently.

## Current behaviour

The classification lives in `packages/core/src/orchestrator/` (the convergence loop) and decides between three actions:

1. **Repair**: spawn an AI agent that reads FEEDBACK.md and tries to fix.
2. **Skip repair**: classified as transient/remote — log it and mark failed.
3. **Retry**: increments attempt counter and re-runs from scratch.

Today these are conflated. Once a task is marked failed, downstream cannot proceed, and the whole run aborts at the next "no DAG progress" tick.

## Proposal

Define three error classes with distinct recovery policies, each emitted as a typed `error_class` field on every `CLAUDEFN_FAILED` or `TASK_FAIL` event.

| Class | Examples | Recovery |
|---|---|---|
| **transient** | HTTP 5xx, idle timeout, rate limit (429), socket timeout, partial network failure | Exponential backoff retry (1s, 2s, 4s, 8s, 16s; ceiling 5 min). After `maxAttempts`, **defer** the task (status: `deferred`, eligible for next run cycle) — NOT mark failed. |
| **deterministic** | Check fails, missing input, dart-analyze error, wrong-shape output | Pass to AI-repair agent with FEEDBACK.md (current behaviour). After `maxAttempts`, mark failed. |
| **authoring** | Cycle detected, template var mismatch, bad spawn syntax, missing skill file | Fail the **run** immediately with a pointer to source location. Do not retry. Do not invoke repair. |

## Code-level design

### 1. New type

```ts
// packages/core/src/orchestrator/error-class.ts

export type ErrorClass = "transient" | "deterministic" | "authoring";

export interface ClassifiedError {
  class: ErrorClass;
  reason: string;
  retryAfterMs?: number;  // present when class === "transient"
  sourcePath?: string;     // present when class === "authoring"
  sourceLine?: number;
}

export function classifyError(err: unknown): ClassifiedError {
  const msg = String((err as any)?.message ?? err);

  // Authoring errors — surface to human, never retry
  if (msg.includes("Unknown flag for spawn template")) {
    return { class: "authoring", reason: "Spawn syntax error", sourcePath: /* extract from stack */ };
  }
  if (msg.includes("references undefined variable")) {
    return { class: "authoring", reason: "Template var mismatch" };
  }
  if (msg.includes("Cycle detected")) {
    return { class: "authoring", reason: "Dependency cycle" };
  }
  if (msg.includes("Missing required field") || msg.includes("Invalid frontmatter")) {
    return { class: "authoring", reason: "Malformed TASK.md" };
  }

  // Transient errors — exponential backoff
  if (msg.includes("idle-timed out") || msg.includes("ETIMEDOUT")) {
    return { class: "transient", reason: "Idle timeout", retryAfterMs: 1000 };
  }
  if (msg.includes("429") || /rate.?limit/i.test(msg)) {
    return { class: "transient", reason: "Rate limit", retryAfterMs: 5000 };
  }
  if (msg.match(/HTTP 5\d\d/) || msg.includes("ECONNRESET") || msg.includes("ENOTFOUND")) {
    return { class: "transient", reason: "Upstream error", retryAfterMs: 2000 };
  }

  // Default: deterministic
  return { class: "deterministic", reason: msg };
}
```

### 2. Wire into the executor

In `packages/core/src/executor/seed-executor.ts` (the catch around `executor()`):

```ts
try {
  await executor();
} catch (err) {
  const classified = classifyError(err);
  await emitEvent({ type: "CLAUDEFN_FAILED", errorClass: classified.class, reason: classified.reason });

  switch (classified.class) {
    case "transient":
      const attempt = ctx.attempt;
      if (attempt < ctx.maxAttempts) {
        const delay = classified.retryAfterMs! * Math.pow(2, attempt - 1);
        await sleep(Math.min(delay, 300_000));  // cap at 5 min
        return scheduleRetry(ctx);
      }
      return markDeferred(ctx);  // NEW: deferred is not failed

    case "deterministic":
      return invokeRepairAgent(ctx, classified);

    case "authoring":
      await emitEvent({ type: "AUTHORING_ERROR", sourcePath: classified.sourcePath });
      throw new AuthoringError(classified.reason, classified.sourcePath);  // bubble to top-level
  }
}
```

### 3. New task state: `deferred`

In `packages/core/src/journal/runstate.ts` (or wherever task status enum lives), add `deferred`. Deferred tasks:
- Don't block downstream that depends on them — they're "soft-failed".
- Are picked up on the next `converge run --resume` automatically.
- Show as yellow (vs red for failed) in `converge list`.

Note: the orchestrator must understand that downstream of a deferred task is also blocked — so the DAG walker should treat `deferred` like "pending, but with backoff history". Implementation: `deferred + dependsOn[].status in {done, deferred(complete)}` is eligible.

### 4. Top-level handling of authoring errors

When the runner catches an `AuthoringError` bubbled up, it should:
1. Print the source location with a code excerpt.
2. Print a suggested fix from the rule's `fix:` field (when classified by validator).
3. Exit non-zero with a distinct exit code (e.g. `64` for "EX_AUTHORING") so CI can distinguish "your playbook is wrong" from "the run failed due to flaky LLM".

### 5. Event-stream changes

Add to every `CLAUDEFN_FAILED` event:

```json
{
  "errorClass": "transient" | "deterministic" | "authoring",
  "reason": "<one-line reason>",
  "retryCount": <int>,
  "retryAfterMs": <int>?,
  "sourcePath": "<path>"?
}
```

Existing consumers ignore the new fields. New consumers (RFC 0011 dashboard) can group failures by class.

## Migration

- **Mostly backwards-compatible.** Existing playbooks with only `failed` states keep working.
- The `deferred` state is new; some scripts that grep journals for `"status":"failed"` may want to also include `"status":"deferred"` depending on intent.
- The `EX_AUTHORING` exit code (64) is new; CI scripts that bucket exit codes need updating.

## Configuration

Add to `project.yml`:

```yaml
errorHandling:
  transient:
    maxRetries: 5
    initialBackoffMs: 1000
    maxBackoffMs: 300000
  deterministic:
    maxAttempts: 3
  authoring:
    failFast: true  # exit immediately
```

Sensible defaults; users can override per-project.

## Test plan

Add tests under `packages/core/src/orchestrator/__tests__/error-class.test.ts`:

1. **Idle timeout** → `transient`, retry with backoff.
2. **429** → `transient`, retry.
3. **5xx** → `transient`, retry.
4. **Check fail** → `deterministic`, repair agent invoked.
5. **Missing input** → `deterministic`, repair.
6. **Cycle detected** → `authoring`, run aborts.
7. **Unknown flag** → `authoring`, run aborts with source pointer.
8. **Template var mismatch** → `authoring`.
9. **Exhausted transient retries** → task marked `deferred`, not `failed`.
10. **Deferred task's downstream**: another `run --resume` picks it up and unblocks downstream.

End-to-end: simulate a mock LLM provider that returns 429 three times then succeeds. The task should converge after retries; the run should not abort.

## Out of scope

- Per-task retry overrides in TASK.md frontmatter (could be RFC 0017's domain).
- Adaptive backoff based on server hints (`Retry-After` header). Add later if useful.
- Cross-task error correlation (e.g. "all 12 of these failed with the same 429"). RFC 0011 dashboard concern.
