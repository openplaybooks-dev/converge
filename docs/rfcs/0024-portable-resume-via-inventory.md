---
rfc: 0024
title: Portable resume via the inventory ledger
status: draft
type: feat
source: human
priority_tier: tier0
estimate: "3-4 days"
backwards_compatible: yes
risk: high
breaks_existing: no
---
# RFC 0024: Portable resume via the inventory ledger

## Three-layer ontology

Converge has three artefact layers, and each has a different lifetime:

| Layer | Lives in | Role | Lifetime |
|---|---|---|---|
| **Playbook** | `.converge/playbooks/<pb>/` (TASK.md, playbook.yml, skills, scripts) | **Factory** — the source spec that defines what gets produced | Forever; evolves through edits |
| **Inventory** | `.converge/inventory/<pb>/tasks.jsonl` | **Machine** — the concrete catalogue of instantiated tasks with their current declared status, fingerprint, and contract | Across machines via git; one source of truth for "what has been done" |
| **Journal** | `.converge/journal/<pb>/` (runstate.json, attempts/, logs/, locks) | **Context** — the per-machine runtime trace: attempts, logs, leases, worker IDs | Machine-local; reconstructible from the inventory |

The arrows are one-way: **factory → inventory → journal**. The journal is *derived* state. It must be reconstructible from the inventory alone, otherwise cross-machine work is impossible.

Today the framework satisfies factory → inventory partially (the inventory is created and seeded), but the **journal → inventory** write-back is incomplete: only `taskPath`, `title`, `summary`, `source` are written on creation; `status` is hard-coded to `"todo"` and never updated; `fingerprint` and `completedAt` do not exist. The inventory therefore cannot drive the journal's reconstruction on a peer machine. This RFC closes that gap.

## Problem

Converge promises durable execution: a run that paid for hundreds of tasks should not have to repay just because a teammate clones the repo. Today it does.

Concrete scenario, observed in `/Users/minh/Documents/mezon-bot-ai` on 2026-05-20:

1. Machine A authors and runs four playbooks (`ingest-engine`, `mezon-backend`, `mezon-portal`, `rag-engine`). Stages 01–10 of each complete. Every declared output is committed (`apps/backend`, `packages/rag-core`, `.stitch/backend`, `apps/portal`, `benchmarks/results` — visible at commit `e6c722c`).
2. Machine A pushes. The committed working tree contains the source playbooks and all the produced artefacts, but the runtime state under `.converge/journal/` is *gitignored* by the default project scaffold (`/Users/minh/Documents/mezon-bot-ai/.gitignore:1`).
3. Machine B clones and runs `converge run`. The runner finds no `runstate.json` for any of the four playbooks. The cache decision at `packages/core/src/run/index.ts:717-729` requires three predicates to skip a task:
   - `priorNode.status === "pass"` — read from runstate. **MISSING.**
   - `fp === priorNode.fingerprint` — fingerprint is sha256 of TASK.md + checks + inputs (`packages/core/src/run/helpers.ts:72-95`); deterministic across machines; would match.
   - `outputs.every(existsSync)` — committed files exist; would pass.
4. Predicate 1 collapses the whole branch. The runner re-executes every task that machine A already paid for: hours of LLM time, dollars of token cost, and any non-deterministic generation steps now diverge from what was already committed (and reviewed).

The cause is not that journal state is excluded from git — that exclusion is *correct*: machine-specific logs, locks, leases, and worker IDs do not belong in source control. The cause is that **the framework has no committable surface for the one signal `--resume` actually needs from a peer: "task T previously passed with fingerprint F."**

A teammate-clone is the same problem class as `--resume` after a crash on the same machine. The local case works because `runstate.json` survives. The cross-machine case fails because nothing else carries the equivalent signal.

## Proposal

**Don't invent a new artefact. Upgrade the one we already have.**

`.converge/inventory/<playbook>/tasks.jsonl` is already produced on every run (`packages/core/src/run/index.ts:872-884` for static DAGs, `packages/core/src/task/spawn/apply.ts:630` for spawned children). It is already not gitignored (the mezon-bot-ai repo proves this — four `tasks.jsonl` files are committed). It is already append-only JSONL with file-locking (`withFileLock` at `runtime-ledger.ts:11`), atomic compaction (`atomicWriteFileSync` at `runtime-ledger.ts:232`), an mtime-keyed cache (`runtime-ledger.ts:115-135`), and an incremental append-to-cache fast path (`runtime-ledger.ts:149-159`). It is *already* a production-grade, code-reviewable, version-controlled record of task identity.

It just isn't yet the source of truth for resume. Every row in the mezon-bot-ai inventory has `"status":"todo"` — even for tasks whose outputs are committed and demonstrably done. Today's runner records the journal-side `pass` transition but never reflects it back to the inventory.

This RFC closes that gap with **one write site, one read site, one summary line**:

1. **On every status transition:** mirror the journal's runtime status into the inventory ledger via the existing `appendTaskUpsert(...)`. Mapping:

   | Journal `RunStateNode.status` | Inventory `TaskRuntimeStatus` |
   |---|---|
   | `pending` | `todo` |
   | `running` | `doing` |
   | `seeded` | `doing` (spawn-in-flight = mid-work) |
   | `pass` | `done` (carries `fingerprint` + `completedAt`) |
   | `error` | `blocked` (operator must fix or retry) |
   | `skipped` | `dropped` |

   The inventory becomes a true layer between factory and journal: identity, current status, and the fingerprint that lets a peer machine reconstruct the journal context.

2. **On startup:** in `RunStateManager.tryLoadExisting()`, if `runstate.json` is missing, fall back to `readRuntimeLedgerState()` and hydrate `state.dag.nodes` from rows where `status === "done"`. The existing change-detection loop at `run/index.ts:697-749` then runs unchanged — it does not care whether prior `pass` came from runstate or inventory.
3. **At run start:** emit a one-line reconcile summary so teams can see what changed since the inventory was written.

No new file. No new directory. No new schema concept. No CLI surface required for the happy path.

### Inventory row — augmented schema

Two optional fields are added to `RuntimeTask` (`packages/core/src/task/goal/runtime-ledger.ts:35-52`). Both are nullable; rows written by older CLIs (like the four already committed in mezon-bot-ai) parse cleanly and are interpreted as "do not hydrate" — exactly today's behaviour. No migration is required.

```ts
export interface RuntimeTask {
  // ... existing fields ...
  outputs?: string[];          // already declared; not yet written by runner
  checks?: Array<{ id: string; cmd: string }>;  // already declared
  fingerprint?: string;        // NEW — sha256 of TASK.md + checks + inputs
  completedAt?: string;        // NEW — ISO timestamp of pass transition
}
```

A committed row after this RFC lands looks like:

```jsonc
{
  "id": "02-api-inventory",
  "taskPath": ".converge/journal/mezon-backend/tasks/02-api-inventory",
  "goalId": "inventory",
  "summary": "Sweep test — every state-changing endpoint writes an AuditEvent",
  "status": "done",
  "source": "static",
  "playbook": "mezon-backend",
  "outputs": [".stitch/backend/resources.json", ".stitch/backend/endpoints.json", ".stitch/backend/data-model.json"],
  "fingerprint": "sha256:8a7c…",
  "completedAt": "2026-05-18T09:21:00Z",
  "createdAt": "2026-05-18T08:55:12Z",
  "updatedAt": "2026-05-18T09:21:00Z"
}
```

The `outputs` and `checks` written to the row are **advisory only**. The runner re-reads them from the live TASK.md on every run. A stale ledger row cannot lie about output paths or check commands — it can only lie about *prior status*, and the fingerprint check catches that the moment the TASK.md changes.

**Attempt detail stays journal-only.** Per-attempt logs, durations, errors, worker IDs, leases — these are machine-specific and not useful for cross-machine reconstruction. They live in `.converge/journal/`. The inventory carries identity + current status + fingerprint, nothing more. Clean separation: inventory is durable truth, journal is reproducible trace.

### Hydration path

In `RunStateManager.tryLoadExisting()` (`packages/core/src/manifest/run-state-manager.ts:231`), insert a branch at the top:

```ts
private tryLoadExisting(): void {
  if (!existsSync(this.statePath)) {
    this.hydrateFromInventory();   // NEW — no-op if no playbook context or no inventory
    return;
  }
  // ... existing runstate.json hydrate, unchanged ...
}
```

`hydrateFromInventory()` reads `runtimeTasksPath(projectDir, playbookName)` (`runtime-ledger.ts:270`) and for each row with `status === "done"` and a `fingerprint` sets the matching `dag.nodes[id]` to:

```ts
{
  status: "pass",
  fingerprint: row.fingerprint,
  completed_at: row.completedAt,
  output_hashes: undefined,   // recomputed by the existing cache check
}
```

Rows without `fingerprint` (i.e. written by an older CLI) are silently ignored — they cannot drive the cache check without that field, and we refuse to fabricate one.

After hydration, control returns to `runDag` and the existing change-detection loop (`run/index.ts:697-749`) reconciles each hydrated node against the *current* TASK.md fingerprint and on-disk outputs. This is the same algorithm it executes on the local-resume path, fed from a different source.

### Reconcile summary

At the top of `runDag`, after change-detection has produced its counts, emit a single reporter event:

```
reconciled (mezon-backend): 12 cached · 3 reset (TASK.md changed) · 1 reset (output missing) · 2 new
```

Counts are derived from the change-detection loop's existing decisions, not recomputed. Buckets:

- **cached** — fingerprint matched and outputs exist; the existing cache path picked it up.
- **reset (TASK.md changed)** — hydrated as `pass`, but current fingerprint differs from the inventory fingerprint.
- **reset (output missing)** — hydrated as `pass`, fingerprint matched, but at least one declared output is no longer on disk.
- **new** — task is in the current DAG but has no `done` row in inventory.

Non-interactive, CI-friendly, one line per playbook. No prompt, no confirmation gate. For per-node detail, the existing `converge why --task <id>` covers it.

### Fresh-run escape hatch

If reconciliation cannot resume safely (corrupt inventory, dramatic playbook restructure, user just wants a clean slate), `converge run --full-refresh` already exists (`packages/cli/src/commands-run.ts:47-48`) and ignores prior state entirely. Every committed output is re-derived from scratch. This RFC does not need a parallel "rebuild" command — the framework already handles fresh runs perfectly.

The user request explicitly called out this requirement: "event not able to resume it still ne able to peform a fersh run with re execute all the completed taask." `--full-refresh` is that.

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **RFC 0005 (frontier checkpoint)** | Sibling, not overlap. 0005 makes same-machine `--resume` *fast* on large DAGs by avoiding a full DAG re-walk; 0024 makes resume *possible at all* on a peer machine. 0005's `frontier.json` is machine-local (it indexes `runstate.json`); 0024's enriched inventory is the portable signal. After both ship, the resume code path checks `frontier.json` first; if missing, falls back to `runstate.json`; if also missing, falls back to the inventory hydrate from this RFC. |
| **RFC 0023 (schema upgrade migration)** | Composes. 0023 handles the case where a stored TASK.md no longer parses after a CLI upgrade. 0024 handles the case where there is no stored state at all. Together they cover the four quadrants of (state present? × schema current?). |
| **RFC 0019 (per-attempt snapshots)** | Different concern. 0019's snapshot bundles are forensic blobs per attempt for replay/debugging. 0024's inventory row is the lightweight per-task contract that drives cache decisions. They can both exist without interfering. |
| **RFC 0013 (surgical reset)** | Composes. `converge reset <playbook> <task>` should also flip the inventory row to a non-`done` status (or remove it), otherwise the reset is undone the next time the runner hydrates. This RFC adds that one line. |
| **RFC 0021/0022 (declarative spawn, task mode)** | Both write inventory rows already; 0024 just teaches them to also carry the `done`/`fingerprint` data on completion. Their `spawn.plan.jsonl` is per-task and remains untouched. |

## Code-level design

### Files modified

1. **`packages/core/src/task/goal/runtime-ledger.ts`** — extend the `RuntimeTask` interface with `fingerprint?: string` and `completedAt?: string`. Thread both fields through the `appendTaskUpsert` insert and update branches.

2. **`packages/core/src/manifest/run-state-manager.ts`**

   - Add a `playbookName` field captured from the existing constructor input (`dag.playbookName` is already read at line 200 for metadata).
   - Add `private hydrateFromInventory(): void`. Reads `runtimeTasksPath(projectDir, playbookName)` via the existing `readRuntimeLedgerState()`. For each row with `status === "done"` and `fingerprint` defined, sets the matching `state.dag.nodes[id].{status: "pass", fingerprint, completed_at}`. Silently skips rows whose id is not in the current DAG (renamed/removed tasks) and rows without a fingerprint (legacy data).
   - Modify `tryLoadExisting()` to call `hydrateFromInventory()` when `!existsSync(this.statePath)`. The existing corrupt-runstate forensics path is unchanged.
   - Add `private publishInventoryStatus(nodeId, inventoryStatus)`. Called from **every** `mark*` method. Composes a `RuntimeTask` patch and calls `appendTaskUpsert`. Best-effort: a write failure logs to stderr but never throws — the journal is the authoritative record at this point and the inventory is a derived signal.
   - Wire `markRunning` → `"doing"`, `markSeeded` → `"doing"`, `markComplete` / `markCached` → `"done"`, `markFailed` → `"blocked"`, `markSkipped` → `"dropped"`, `markPending` → `"todo"`.
   - Defensive fallback: `markComplete` without a prior `setNodeFingerprint` (defensive path; should not happen in production because change-detection always fingerprints first) publishes `"doing"` instead of `"done"`, refusing to commit an un-validatable cache signal.
   - Add `hasInventoryHydratedPriorState()` and `inventoryHydratedAsPrevState()` so the change-detection loop in `run/index.ts` can consume the hydrated state via the same code path as `loadPrevRunState()`.

3. **`packages/core/src/run/index.ts`**

   - In the change-detection block, when `loadPrevRunState()` returns null but `hasInventoryHydratedPriorState()` is true, use `inventoryHydratedAsPrevState()` as the prior state. The existing topological loop then reconciles each hydrated node against the current TASK.md fingerprint and on-disk outputs.
   - Bucket the loop's decisions into `cachedCount`, `resetEditedCount`, `resetMissingOutputCount`, `newCount`. Emit one `kind: "log", level: "info"` reporter event with the reconcile summary line when `reconciledFromInventory` is true.

4. **`packages/core/src/task/spawn/apply.ts`** — no changes. Spawned children get their status transitions through the same `RunStateManager.mark*` methods as static tasks, so the inventory writes flow for free.

### Files **not** modified

- DAG compilation
- Task execution loop
- `computeFingerprint` algorithm
- The three-predicate cache check (`run/index.ts:717-729`) — the new code path only changes the *source* of `priorNode`, not the cache predicate
- Journal layout
- Project scaffolding `.gitignore` template (`.converge/inventory/` is already not gitignored across the example gallery)
- `--resume` / `--restart` / `--full-refresh` flag semantics

### Concurrency

`appendTaskUpsert` already holds the file lock and updates the mtime-keyed cache incrementally. The pass transition is serialised by the runner's existing per-task lease. No new lock, no new race.

### Worst-case state on a stale clone

| Scenario | Behaviour |
|---|---|
| Inventory carries `done` + matching fingerprint + outputs on disk | Cached. (Happy path — the whole point.) |
| Inventory carries `done` + matching fingerprint + an output missing | Task re-runs. (Existing cache-check predicate 3.) |
| Inventory carries `done` + non-matching fingerprint | Task re-runs. (Existing cache-check predicate 2.) |
| Inventory carries `done` for a task id no longer in the DAG | Silently skipped at hydrate. Old row is left as-is in the JSONL — it documents history. A future `converge clean` could compact, but this RFC does not require it. |
| Inventory carries `done` without a `fingerprint` (legacy data) | Silently skipped. Task re-runs as if there were no signal. |
| Inventory file missing | `readRuntimeLedgerState` returns empty. Equivalent to today's fresh-run behaviour. |
| Inventory file corrupt | `parseJsonl` already drops bad lines silently (`runtime-ledger.ts:86-91`). Surviving rows hydrate as above. |
| Two clones diverge and merge | JSONL is line-oriented and append-only; git's union merge resolves cleanly. Worst case: two `done` rows for the same id with different fingerprints — `readRuntimeLedgerState` already deduplicates by id with last-write-wins (`runtime-ledger.ts:writeTaskRows` → topo + dedupe). |

## Implementation steps

1. **Extend `RuntimeTask`** with `fingerprint?` and `completedAt?` fields and thread both through `appendTaskUpsert`. Verify: `pnpm typecheck` clean.
2. **Add `publishInventoryStatus`** to `RunStateManager` and wire from every `mark*` method. Verify: run an `examples/` playbook; `.converge/inventory/<pb>/tasks.jsonl` shows the correct status for each task at each lifecycle stage; `git diff` shows clean JSONL line additions.
3. **Add `hydrateFromInventory`** branch to `tryLoadExisting`. Add `hasInventoryHydratedPriorState` + `inventoryHydratedAsPrevState` accessors. Verify: copy the example to a temp dir, `rm -rf .converge/journal/`, keep `.converge/inventory/`, `converge run` — cached-count equals the count from step 2; no task re-executes.
4. **Wire inventory hydrate into change-detection** in `run/index.ts`. Bucket decisions and emit reconcile summary. Verify: step 3 plus the summary line in the run output.
5. **Update affected example `.gitignore`s** to explicitly add a comment confirming `.converge/inventory/` is intentionally tracked. No functional change; documentation only.
6. **Update `converge reset`** (RFC 0013 compose) to also flip the inventory row to a non-`done` status. Defer if 0013 hasn't shipped; otherwise piggyback in this PR.

## Test plan

Unit tests under `packages/core/tests/manifest/`:

1. **hydrate-from-inventory-happy** — fixture with `runstate.json` absent and `tasks.jsonl` containing one `done` row with fingerprint matching the current TASK.md. After hydrate, the node has `status: "pass"` and the fingerprint preserved.
2. **hydrate-skips-legacy-rows** — same fixture but the row has no `fingerprint`. Node stays `pending`; no warning thrown.
3. **hydrate-ignores-unknown-id** — row references a task id not in the current DAG. No throw; no node touched.
4. **write-on-pass-roundtrip** — drive a node to pass via the manager; assert `tasks.jsonl` gained a line with `status: "done"`, the right fingerprint, and the TASK.md outputs.
5. **write-then-hydrate** — combine: pass a node, simulate process restart (new `RunStateManager` over the same project with no `runstate.json`), assert the node hydrates back to `pass`.
6. **stale-fingerprint-resets** — pass a node, mutate the TASK.md, restart, assert change-detection sets the node back to `pending`.
7. **missing-output-resets** — pass a node, delete a declared output file, restart, assert the node resets to `pending`.
8. **reconcile-summary-line** — assert the reporter event with the four bucket counts is emitted exactly once per playbook at run start.

Integration test under `tests/test-portable-resume/`: a synthetic project with a 5-task playbook. Run on machine A semantics (full execution), commit the inventory (no journal), nuke the journal, run again with no `--resume` flag, assert zero task executions and a reconcile summary showing `5 cached`.

## Anti-goals

- **Not** committing `.converge/journal/`. Journal stays gitignored; logs, leases, worker IDs, and attempt detail are machine-local by design.
- **Not** introducing a new "snapshot" or "checkpoint" file. The existing inventory ledger already carries the right shape; adding another file would be cargo.
- **Not** versioning the inventory schema. The two new fields are optional; older rows degrade gracefully to "no hydrate." If we ever need to bump format, that is a separate RFC.
- **Not** auto-running `converge clean` to prune dropped rows. Stale rows are history, not garbage; let the user decide when to compact.
- **Not** writing inventory rows for `failed` or `running` statuses. The portable signal is "previously passed"; everything else is local-only and gets recomputed.

## Open questions

1. **Inventory rows for spawned children.** Spawned children get their `done` transition through the same code path as static tasks, but their `id` is generated at spawn time. If the spawn is non-deterministic (e.g. fan-out keyed on a list whose order differs across machines), the ids will differ and hydration will miss them. Lean: this RFC writes the inventory row regardless; the cache miss for non-deterministic spawns is a separate problem and probably the spawn protocol's responsibility (RFC 0002, 0016). Document the limitation; do not block this RFC on it.

2. **Migration from existing committed inventories.** The four `tasks.jsonl` files in mezon-bot-ai right now have `status: "todo"` for everything. After this RFC ships, the original author must re-run any one playbook on their machine to populate the new fields, then commit. The cloner remains stuck until that happens. Could we mitigate by computing fingerprints from the *committed* TASK.md and verifying outputs exist, then writing the inventory rows on first `converge run --hydrate-from-outputs`? Lean: yes, ship a one-shot diagnostic command `converge snapshot --backfill` that does exactly this — it is the same logic as the runtime path, just executed eagerly. Defer to a follow-up RFC; do not block this one.

3. **Reconcile summary verbosity in CI.** A four-bucket summary is friendly to humans but noisy to CI logs. Should there be a `--quiet` flag? Lean: the existing reporter already has level filtering; emit at `info`; CI configs that want it silenced can drop the level. No new flag.

4. **What if `playbookName` is unavailable in the manager constructor?** A handful of test paths construct `RunStateManager` without a playbook name (the manifest-only branch at `run-state-manager.ts:124-130`). Lean: `hydrateFromInventory()` is a no-op when no playbook name is set. The path is exercised by unit tests, not production resume, so the loss of functionality is acceptable and the code stays simple.

## Why now

The mezon-bot-ai clone is the first observed case of cross-machine resume being impossible despite the outputs being committed. It will not be the last — every team adopting Converge will hit this on the first `git clone`. Without 0024, the framework's durable-execution pitch breaks the moment more than one developer is on the project.

The fix is unusually small for its impact: two writes, one read, two new optional fields on an existing schema. No new file, no new directory, no new concept for teams to learn. The inventory ledger has been sitting in the framework with the right shape and the wrong write-side semantics; this RFC closes that gap.
