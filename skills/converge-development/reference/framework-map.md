# Framework map — where things live

A subsystem→location→symptom cheat sheet for diagnosing framework bugs. Use it in step 5 of the dev loop.

Repo root: `/Users/minh/Documents/converge`. All paths below are relative to root unless noted.

## Monorepo layout

```
packages/
  core/         framework engine (navigator, gap detection, journal, checkpoint, planning, …)
  cli/          `converge` command — arg parsing, subcommands, output formatting
  agentfn/      unified agent function — single callable across all AI providers
  claudefn/     Claude provider — spawns `claude` CLI programmatically
  acpfn/        ACP provider — wraps Anthropic Client Protocol SDK
  kimifn/       Kimi provider
  qwenfn/       Qwen provider
  geminifn/     Gemini provider
  openfn/       Opencode AI provider
  navigator/    generic graph-driven state machine / convergence loop
  codets/       code-generation utilities (fluent TS/JSX/MD emitter)
  project-root/ canonical project-root resolver (finds nearest `.converge/`)
  provider-benchmark/ deep journal analysis for comparing AI providers
  swebench/     SWE-bench Lite evaluation runner
  tbench/       terminal-bench evaluation runner
  studio/       (reserved)
```

The CLI binary is `packages/cli/dist/index.js`. The runtime entry from the binary is `packages/cli/src/main.ts` → individual `commands-*.ts` files.

## Subsystem → location → symptoms

### Navigator (convergence engine)
- **Source:** `packages/core/src/navigator/core/navigator.ts`, `packages/core/src/navigator/core/actions/`, `packages/navigator/src/`
- **Also:** `packages/core/src/converge/converge-runner.ts` (wave-based outer loop with gap-ledger tracking)
- **Symptoms:**
  - Node stuck in `buffered` / `executing` status across iterations
  - Action phases fire out of order (preflight skipped, response duplicated)
  - Stall detection misfires (declares stall when progress is visible, or fails to detect repeating failures)
  - `signal-done` fires when gaps still exist; or gaps resolved but loop never exits
  - Navigate iterates without progress (gap unchanged across iterations)
- **Reproduce against:** `examples/test-simple-run` (smallest), `examples/test-loop-detection` (stall), `examples/hello-world` (fast loop)
- **Watch:** stdout iteration markers, per-task `events.jsonl`, per-attempt `logs/events.jsonl`

### Executor (task execution within navigator)
- **Source:** `packages/core/src/navigator/core/actions/execution/run-executor.ts`, `packages/core/src/navigator/core/actions/execution/`
- **Symptoms:**
  - Task spawn fails / process never starts
  - Wrong exit code interpretation (success treated as failure or vice versa)
  - Hangs after spawn (no event stream, no timeout)
  - Execution skips seed-spawned children
  - Skill symlink setup/teardown fails silently
- **Reproduce against:** `examples/hello-world` for single-task path, any example with seed for parallel spawn
- **Watch:** process spawn lines in stdout, per-attempt `logs/events.jsonl`

### Journal
- **Source:** `packages/core/src/journal/`
- **Key file:** `packages/core/src/journal/structure.ts` (path layout and file-type mapping)
- **Symptoms:**
  - Materialized TASK.md missing or stale in journal
  - Attempt log files not written
  - `events.jsonl` truncated mid-write
  - Status file (`status.json`) corrupted or stale
  - Gap snapshot (`gaps.yml`) missing
- **Reproduce against:** any example; `examples/hello-world` makes the file set easiest to inspect
- **Watch:** `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/` and `attempts/<n>/`

### Checkpoint
- **Source:** `packages/core/src/checkpoint/`
- **Symptoms:**
  - Resume fails after a clean kill
  - Parent stays `seeded` while all children show complete
  - Status flip-flops between iterations
  - `progress.completedChildren` doesn't match disk reality
  - Checkpoint write fails silently (partial write, missing fields)
- **Reproduce against:** `examples/test-resume`, examples with seed children (e.g. `examples/test-seeding`)
- **Watch:** `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/checkpoint.json`

### Seed (dynamic child spawning)
- **Source:** `packages/core/src/navigator/core/actions/resolution/resolve-seed.ts`, plus example `seeds/index.js` scripts
- **Symptoms:**
  - Seed script runs but children don't appear in tree
  - Children spawn but parent rollup never fires
  - Seed spawns duplicate tasks across iterations
  - Seed script not found (path resolution wrong)
  - Seed repair fires on transient errors
- **Reproduce against:** `examples/test-seeding`, `examples/test-seed-repair`, `examples/autonomous-pentest` (heavy seed use)
- **Watch:** `converge list`, per-task `checkpoint.json` (`totalChildren` vs `completedChildren`)

### Gap detection
- **Source:** `packages/core/src/task/gap/`
- **Key types:** `packages/core/src/task/gap/types.ts` (`GapKind`, `GapType`, `CompactGap`)
- **Key logic:** `packages/core/src/task/gap/detector.ts` (`GapDetector`, `ConvergenceAnalyzer`)
- **Gap kinds:** `plan`, `seed`, `seed-script`, `blocker`, `output`, `check-failed`, `corrupted`, `systemic`, `user-question`, `insufficient-evidence`, `contradictory-finding`, `untested-hypothesis`
- **Symptoms:**
  - Gap persists across waves despite valid outputs on disk
  - Wrong gap kind assigned (e.g. `seed-script` gap on a hand-written task)
  - Gap score doesn't improve between waves (stall trigger)
  - `detect-gaps` action returns empty when gaps clearly exist
  - Input gaps not traced to upstream task outputs
- **Reproduce against:** `examples/test-buggy-check`, `examples/test-gap-blocked-input`, `examples/test-gap-missing-output`
- **Watch:** per-task `gaps.yml`, per-attempt gap events in `logs/events.jsonl`

### Validation / checks
- **Source:** `packages/core/src/validation/`
- **Symptoms:**
  - Check passes when output is wrong / fails when output is right
  - Check predicate evaluates against stale state
  - Check error message uninformative
- **Reproduce against:** `examples/test-buggy-check` (check behavior), `examples/hello-world` (single check)
- **Watch:** per-attempt `CHECK.md`, navigator `verify` action output

### Planning / synthesis / orchestrator
- **Source:** `packages/core/src/planning/`, `packages/core/src/synthesis/`, `packages/core/src/orchestrator/`, `packages/core/src/runtime/`
- **Symptoms:**
  - Wrong task chosen as next-task
  - Phase transitions out of order
  - Synthesis step produces empty / malformed output
  - `plan` gap appears but re-planning produces invalid plan
- **Reproduce against:** multi-phase examples (`examples/autonomous-pentest`)
- **Watch:** plan-related navigator actions in stdout, per-task `plan.md` in journal

### Storage / artifacts
- **Source:** `packages/core/src/storage/`, plus on-disk `.converge/artifacts/<playbook>/`
- **Symptoms:**
  - Artifact path mismatch (task writes to one path, reader expects another)
  - Artifact missing despite task showing complete
  - Artifact overwritten across iterations when it shouldn't be
- **Watch:** `.converge/artifacts/<playbook>/...`

### Hooks
- **Source:** `packages/core/src/hooks/`
- **Symptoms:**
  - Lifecycle hook never fires
  - Hook fires twice
  - Hook exception silently swallowed
- **Watch:** stdout for hook log lines, per-attempt `events.jsonl` for hook events

### agentfn / AI providers
- **Source:** `packages/agentfn/src/` (unified interface + skill management + compose)
- **Also:** `packages/{claudefn,acpfn,kimifn,qwenfn,geminifn,openfn}/` (individual provider clients)
- **Symptoms:**
  - Provider throws on a valid response shape
  - Retry loop doesn't kick in on `Overloaded` / 429 / 5xx
  - Retry loop *over*-retries on a permanent error (400, 401, 403)
  - Token / cost accounting wrong
  - Skill symlinks land in wrong directory
  - Provider selection (`provider:` field) ignored
- **Reproduce against:** whichever example the user has the provider configured for (check `.converge/project.yaml`)
- **Watch:** stdout for `Overloaded`, `API Error`, `429`, `5xx` retry messages; per-attempt `logs/events.jsonl` for provider call records

### CLI
- **Source:** `packages/cli/src/`
  - `main.ts` — entry, arg parsing, command dispatch
  - `commands-run.ts` — `run` command
  - `commands-build.ts` — `build` command
  - `commands-clean.ts` — `clean` command
  - `commands-test.ts` — `test` command
  - `commands-compile.ts` — `compile` command
  - `commands-reset.ts` — `reset` command
  - `commands-list.ts`, `commands-tree.ts` — list/status display
  - `commands-inspect.ts` — task/session inspection
  - `commands-metrics.ts` — cost metrics
  - `commands-gantt.ts`, `commands-graph.ts`, `commands-journal.ts` — visualization
  - `commands-validate.ts` — `verify` command
  - `commands-seed.ts` — `seed` command
  - `commands-playbook.ts` — playbook management
  - `commands-deps.ts` — dependency management
  - `autonomous-run.ts` — autonomous run loop
  - `dag-run.ts` — DAG-based run
  - `run-event-stream.ts` — event stream handling
- **Symptoms:**
  - Wrong arg parsing / unrecognized flag
  - Path-form scoping picks wrong playbook
  - Exit code wrong (0 on failure, non-zero on success)
  - Output formatting broken
  - `--select` expression doesn't match expected tasks
  - `clean --select` deletes wrong or no tasks
- **Reproduce against:** any example; pick the smallest that exposes the subcommand under test
- **Watch:** the actual CLI command's output

## How to use this map

1. Match the symptom to a subsystem row above.
2. Open the listed source files.
3. Trace the call path from the symptom backwards.
4. Cross-reference with `troubleshooting/playbook.md` — if the symptom is recorded, follow the recipe.
5. If the diagnosis crosses subsystem rows (e.g. navigator ↔ seed, or gap detection ↔ agentfn), surface the hypothesis to the user before editing.
