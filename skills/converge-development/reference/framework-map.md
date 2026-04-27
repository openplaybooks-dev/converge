# Framework map — where things live

A subsystem→location→symptom cheat sheet for diagnosing framework bugs. Use it in step 5 of the dev loop.

Repo root: `/Users/minh/Documents/converge`. All paths below are relative to root unless noted.

## Monorepo layout

```
packages/
  core/         framework engine (convergence loop, executor, journal, checkpoint, WBS, …)
  cli/          `converge` command — arg parsing, subcommands, output formatting
  claudefn/     Claude provider adapter
  geminifn/     Gemini provider adapter
  kimifn/       Kimi provider adapter
  qwenfn/       Qwen provider adapter
  openfn/       OpenAI provider adapter
  acpfn/        ACP provider adapter
  agentfn/      agent function utilities
  codets/       code-generation utilities
  navigator/    tree/graph navigation helpers
  swebench/     SWE-bench harness
  tbench/       perf benchmark harness
  meta/         meta utilities
```

The CLI binary is `packages/cli/dist/index.js`. The runtime entry from the binary is `packages/cli/src/main.ts` → `packages/cli/src/commands.ts` → individual `commands-*.ts` files.

## Subsystem → location → symptoms

### Convergence loop
- **Source:** `packages/core/src/converge/`
- **Symptoms:**
  - Iterates without progress (gap unchanged across iterations)
  - Exits before all gaps resolved
  - `Max iterations reached` despite obvious progress
  - "Did not converge" when checks look passing
- **Reproduce against:** `examples/hello-world` (smallest), `examples/autonomous-pentest` (multi-phase, heavier)
- **Watch:** stdout `── Iteration N ──`, gap count per iteration, `events.jsonl` per attempt

### Executor
- **Source:** `packages/core/src/executor/`, `packages/core/src/runners/`, `packages/core/src/process/`
- **Symptoms:**
  - Task spawn fails / process never starts
  - Wrong exit code interpretation (success treated as failure or vice versa)
  - Hangs after spawn (no event stream, no timeout)
  - Concurrent task limit not respected
- **Reproduce against:** `examples/hello-world` for single-task path, anything with WBS for parallel spawn
- **Watch:** process spawn lines in stdout, attempt log under `.converge/journal/<playbook>/tasks/<task>/attempts/<n>/logs/events.jsonl`

### Journal
- **Source:** `packages/core/src/journal/`
- **Symptoms:**
  - Materialized TASK.md missing or stale in `.converge/journal/<playbook>/tasks/<task>/`
  - Attempt log files (`FEEDBACK.md`, `CHECK.md`, `LEARN.md`) not written
  - `events.jsonl` truncated mid-write
  - Session metadata (`metadata.json`) corrupted
- **Reproduce against:** any example, but `examples/hello-world` makes the file set easiest to inspect
- **Watch:** `.converge/journal/<playbook>/sessions/<session-id>/` and `tasks/<task>/attempts/<n>/`

### Checkpoint
- **Source:** `packages/core/src/checkpoint/`, `packages/core/src/resume/`
- **Symptoms:**
  - Resume fails with `Previous session exited with status: cancelled` after a clean kill
  - Parent stays `seeded` while all children show complete
  - Status flip-flops between iterations
  - `progress.completedChildren` doesn't match disk reality
- **Reproduce against:** examples with phases that have children (e.g. `autonomous-pentest`)
- **Watch:** `.converge/journal/<playbook>/checkpoint.json`, per-task `tasks/<task>/checkpoint.json`

### Task / WBS
- **Source:** `packages/core/src/task/`, plus example `wbs/index.js` scripts
- **Symptoms:**
  - WBS script runs but children don't appear in tree
  - Children spawn but parent rollup never fires
  - WBS self-test fails on valid script
  - Dynamic spawn duplicates tasks across iterations
- **Reproduce against:** `examples/autonomous-pentest` (heavy WBS), or any example with `tasks/<task>/wbs/index.js`
- **Watch:** `converge <playbook.yml> tree`, `.converge/journal/<playbook>/tasks/<task>/checkpoint.json` (`totalChildren` vs `completedChildren`)

### Validation / checks
- **Source:** `packages/core/src/validation/`
- **Symptoms:**
  - Check passes when output is wrong / fails when output is right
  - Check predicate evaluates against stale state
  - Check error message uninformative
- **Reproduce against:** `examples/hello-world` (single check), or any example with rich check predicates
- **Watch:** per-attempt `CHECK.md`, `FEEDBACK.md`

### Planning / synthesis / orchestrator
- **Source:** `packages/core/src/planning/`, `packages/core/src/synthesis/`, `packages/core/src/orchestrator/`, `packages/core/src/runtime/`
- **Symptoms:**
  - Wrong task chosen as next-task
  - Phase transitions out of order
  - Synthesis step produces empty / malformed output
- **Reproduce against:** multi-phase examples (`examples/autonomous-pentest`, `examples/deep-research`)
- **Watch:** `next-task` output, phase transitions in stdout

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
- **Watch:** stdout for hook log lines, attempt `events.jsonl` for hook events

### AI providers
- **Source:** `packages/{claudefn,geminifn,kimifn,qwenfn,openfn,acpfn}/`
- **Symptoms:**
  - Adapter throws on a valid response shape
  - Retry loop doesn't kick in on `Overloaded` / 529
  - Retry loop *over*-retries on a permanent error
  - Token / cost accounting wrong
- **Reproduce against:** whichever example the user has the provider configured for (check `.converge/project.yaml`)
- **Watch:** stdout for `Overloaded`, `API Error`, retry messages

### CLI
- **Source:** `packages/cli/src/`
  - `main.ts` — entry
  - `commands.ts` — dispatch
  - `commands-run.ts`, `commands-reset.ts`, `commands-status.ts`, `commands-tree.ts`, etc. — per-subcommand
  - `progress-logger.ts`, `tree-display.ts`, `inspect-display.ts` — output formatting
- **Symptoms:**
  - Wrong arg parsing / unrecognized flag
  - Path-form scoping picks wrong playbook
  - Exit code wrong
  - Output formatting broken
- **Reproduce against:** any example; pick the smallest that exposes the subcommand under test
- **Watch:** the actual CLI command's output

## How to use this map

1. Match the symptom to a subsystem row above.
2. Open the listed source files.
3. Trace the call path from the symptom backwards.
4. Cross-reference with `troubleshooting/playbook.md` — if the symptom is recorded, follow the recipe.
5. If the diagnosis crosses subsystem rows (e.g. executor ↔ journal, or core ↔ provider), surface the hypothesis to the user before editing.
