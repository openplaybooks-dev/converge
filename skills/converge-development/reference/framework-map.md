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
- **Source:** `packages/core/src/navigator/` — `core/navigator.ts`, `core/actions/`, `repair/strategies/`, `repair/agent-runner.ts`
- **Key files:**
  - `packages/core/src/navigator/repair/agent-runner.ts` — runs AI agents, resolves AI config, emits `AGENT_START/COMPLETE/FAILED` events
  - `packages/core/src/navigator/repair/strategies/task-run.ts` — primary task execution strategy (builds prompt, calls `runAgent`)
  - `packages/core/src/task/mode/validator.ts` — RFC 0022 post-body contract validator
  - `packages/core/src/navigator/repair/strategy-catalog.ts` — maps gap kinds to fix strategies
- **Symptoms:**
  - Node stuck in `buffered` / `executing` status across iterations
  - Action phases fire out of order (preflight skipped, response duplicated)
  - Stall detection misfires (declares stall when progress is visible, or fails to detect repeating failures)
  - Navigate iterates without progress (gap unchanged across iterations)
  - Per-task `agent:` field ignored — all tasks use default provider
- **Reproduce against:** `tests/test-simple-run` (smallest), `tests/test-loop-detection` (stall), `tests/test-mixed-model` (provider routing)
- **Watch:** stdout `🤖 AI Provider:` lines, per-task `events.jsonl`, per-attempt `logs/events.jsonl`

### Task discovery & resolution (TASK.md → Unit → DAG)
- **Source:** `packages/core/src/task/discovery/static-children.ts` (folder-scan for `\d{2,3}-` prefixed subdirectories), `packages/core/src/task/unit/factories.ts` (Unit.fromPath), `packages/core/src/task/unit/unit.ts` (Unit class)
- **Also:** `packages/core/src/task/unit/resolve.ts` — `resolveAgent`, `resolvePrompt`, `resolveTaskAI`, `resolveSkill`
- **Also:** `packages/core/src/task/unit/find-gaps.ts` — gap detection from Unit state; `packages/core/src/task/unit/fix-gaps.ts` — gap resolution
- **Symptoms:**
  - Children not discovered despite valid prefix subdirectories
  - `ai:` block in TASK.md ignored (provider falls back to default)
  - Sort order wrong (prefix parsing broken)
  - Gaps double-counted or missing
- **Reproduce against:** `tests/test-compile-discover` (child discovery), `tests/test-mixed-model` (ai: block), `tests/playbook-compile.test.ts` (compile suite)
- **Watch:** compile output (`Compiled default: N nodes`), manifest.json `parent_map`

### TASK.md parsing & schema
- **Source:** `packages/core/src/config/task-md-definition.ts` — `parseTaskMd`, `parseTaskMdString`, `parseFrontmatterToTaskMdDef`, `mapTaskMdToTaskDefinition`, `RESERVED_KEYS`
- **Also:** `packages/core/src/config/task-definition.ts` — `TaskDefinition` interface, `TaskAIConfig`, builder
- **Also:** `packages/core/src/config/declarative-loader.ts` — playbook loading, `resolveTaskDef`, `loadTaskFile`
- **Also:** `packages/core/src/task/playbook/loader.ts` — playbook check parsing and `scripts/`-path validation
- **Symptoms:**
  - Frontmatter field silently ignored (not in `RESERVED_KEYS`, falls through to `vars`)
  - `ai:` block parsed but not mapped (missing from `mapTaskMdToTaskDefinition`)
  - Legacy `type: test` or `.test.md` content still appears in a playbook and now fails hard
- **Reproduce against:** `tests/test-mixed-model` (ai: block), `tests/playbook-compile.test.ts` (compile)
- **Watch:** compile manifest `nodes[].agent` field, `parseTaskMdString` return shape

### DAG & manifest
- **Source:** `packages/core/src/dag/` — `dag-node.ts` (DagNode), `task-dag.ts` (TaskDag), `dag-tree.ts` (execution tree)
- **Also:** `packages/core/src/manifest/` — `types.ts` (Manifest, ManifestNode, RunState), `writer.ts`, `reader.ts`
- **Also:** `packages/cli/src/commands-compile.ts` — compile command, manifest/runstate writing
- **Symptoms:**
  - Wrong node count after compile
  - Parent-child relationships incorrect in manifest
  - Run fails with "No compiled manifest found"
  - Frontier count wrong
- **Reproduce against:** `tests/test-compile-discover`, `tests/playbook-dag.test.ts`
- **Watch:** manifest.json (`nodes`, `parent_map`, `child_map`), runstate.json

### AI config resolution
- **Source:** `packages/core/src/ai/factory.ts` — `resolveAIConfig`, `listAIProviders`, `createAIFactory`, multi-provider config
- **Symptoms:**
  - `provider:` field in project.yaml ignored
  - Multi-provider config falls back to default even when task specifies `agent:`
  - `preferredProvider` not passed through from task metadata
- **Reproduce against:** `tests/test-mixed-model`
- **Watch:** stdout `🤖 AI Provider:` lines, `AI config type:`, `Providers:` debug lines

### Executor (task execution within navigator)
- **Source:** `packages/core/src/navigator/core/actions/execution/run-executor.ts`, `packages/core/src/navigator/core/actions/execution/`
- **Symptoms:**
  - Task spawn fails / process never starts
  - Wrong exit code interpretation (success treated as failure or vice versa)
  - Hangs after spawn (no event stream, no timeout)
  - Execution skips spawner-spawned children
  - Skill symlink setup/teardown fails silently
- **Reproduce against:** `examples/hello-world` for single-task path, any example with `mode: spawner` for parallel spawn
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
- **Watch:** `journal/<playbook>/tasks/<taskId>/` and `attempts/<n>/`

### Checkpoint
- **Source:** `packages/core/src/checkpoint/`
- **Symptoms:**
  - Resume fails after a clean kill
  - Parent stays in spawner-blocked state while all children show complete (the post-task convergeSpawnerParents sweep should transition it)
  - Status flip-flops between iterations
  - `progress.completedChildren` doesn't match disk reality
  - Checkpoint write fails silently (partial write, missing fields)
- **Reproduce against:** `examples/test-resume`, examples with spawner children (e.g. `examples/test-seeding`)
- **Watch:** `journal/<playbook>/runstate.json`, `journal/<playbook>/tasks/<taskId>/status.json`

### Task mode dispatch (dynamic child spawning — RFC 0021/0022)
- **Source:** `packages/core/src/task/spawn/apply.ts` — `applyManifest()`; ingests `spawn.plan.jsonl`, upserts `tasks.jsonl`.
- **Dispatch:** `packages/core/src/navigator/core/actions/execution/{run-spawner,run-converger,run-gateway}.ts` — per-mode action handlers; `run-executor.ts` branches on `unit.mode`.
- **Contracts:** `packages/core/src/task/mode/{schema,validator,converger,inference}.ts` — RFC 0022 cross-field validation, post-body validator, wave loop, back-compat inference.
- **Symptoms:**
  - `mode: spawner` body runs but children don't appear (check `spawn.plan.result.jsonl` for `ok:false` rows)
  - Children spawn but parent rollup never fires (the post-task `convergeSpawnerParents` sweep in `run/index.ts`)
  - Manifest produces duplicate ids across iterations (`errorCode: "duplicate-id"`)
  - `mode: converger` exceeds `max_waves` without halt (`errorCode: "converger-max-waves"`)
  - Migration error: legacy `seed: { mode: cli }` / `seeds:` / `from_seed:` in a TASK.md — parser throws pointing at RFC 0021/0022
- **Reproduce against:** `tests/test-seeding` (basic spawner), `tests/test-queue-pattern` (incremental converger), `tests/test-financial-deep-research` (multi-level)
- **Watch:** `converge list`, `$CONVERGE_TASK_DIR/spawn.plan.{jsonl,result.jsonl}`, `journal/<playbook>/runstate.json`, `inventory/<playbook>/tasks.jsonl`, and `$CONVERGE_TASK_DIR/mode-violation.json` on contract violations.

### Test infrastructure
- **Source:** `tests/*.test.ts` (vitest, root-level integration tests), `tests/test-*/` (fixture directories), `packages/*/tests/` (per-package unit tests)
- **Config:** `/vitest.config.ts` (root, `fileParallelism: false`), `packages/*/vitest.config.ts` (per-package)
- **Key fixtures:**
  - `tests/test-simple-run` — basic single-task run
  - `tests/test-compile-discover` — compile + run separation, child discovery
  - `tests/test-mixed-model` — multi-provider AI routing
  - `tests/test-gap-blocked-input` — dependency backoff, input gaps
  - `tests/test-gap-missing-output` — output gap detection
  - `tests/test-buggy-check` — buggy check relaxation
  - `tests/test-loop-detection` — tool-call loop detection
  - `tests/test-multi-attempt` — multi-attempt convergence
  - `tests/test-queue-pattern` — incremental `mode: converger` do-while loop
  - `tests/test-seeding` — recursive `mode: spawner` spawning
  - `tests/test-financial-deep-research` — named non-default playbook
- **Test patterns:**
  1. **Compile tests** — `converge playbook validate <name>` or `converge run --playbook=<name> --dry`, verify structure and manifest shape
  2. **DAG tests** — verify `depends_on`, `depended_on_by`, `child_map`, content hashes
  3. **Integration tests** — `converge run --playbook=<name>`, check outputs on disk
  4. **Structure tests** — verify TASK.md frontmatter, seed.js exports, playbook YAML
- **Running:** `npx vitest run tests/` (all), `npx vitest run tests/<file>` (specific file), `npx vitest` (watch mode)
- **Adding a test:** create a test fixture under `tests/test-<name>/` with `.converge/project.yaml` + `playbooks/default/` structure, then write a `.test.ts` file that compiles/runs and verifies expected outputs

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
- **Source:** `packages/core/src/validation/`, `packages/core/src/task/checks/`
- **Also:** `packages/core/src/task/playbook/loader.ts` — explicit `cmd` checks + `scripts/` reference extraction
- **Symptoms:**
  - Check passes when output is wrong / fails when output is right
  - Check predicate evaluates against stale state
  - Check error message uninformative
  - check command points at a missing `scripts/...` helper
  - legacy `type: test` / `.test.md` authoring still present
- **Reproduce against:** `tests/test-buggy-check` (check behavior), `packages/core/tests/config/playbook-loader-checks.test.ts`
- **Watch:** per-attempt `CHECK.md`, navigator `verify` action output

### Planning / synthesis / orchestrator
- **Source:** `packages/core/src/planning/`, `packages/core/src/synthesis/`, `packages/core/src/orchestrator/`
- **Symptoms:**
  - Wrong task chosen as next-task
  - Phase transitions out of order
  - Synthesis step produces empty / malformed output
  - `plan` gap appears but re-planning produces invalid plan
- **Reproduce against:** multi-phase examples
- **Watch:** plan-related navigator actions in stdout, per-task `plan.md` in journal

### Storage
- **Source:** `packages/core/src/storage/`, plus on-disk `.converge/inventory/<playbook>/` (ledger + spawned task defs) and `.converge/journal/<playbook>/` (attempts, logs, runstate).
- **Symptoms:**
  - Declared `outputs:` path mismatch (task writes to one path, reader expects another)
  - Declared output missing despite task showing complete
  - Output overwritten across iterations when it shouldn't be
- **Watch:** declared `outputs:` paths in each task's TASK.md, plus `.converge/inventory/<playbook>/tasks.jsonl`

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

## Test fixture → subsystem mapping

Use these when picking a test bed (dev loop step 1). All paths under `tests/`:

| Fixture | Exercises |
|---------|-----------|
| `test-simple-run` | Basic task execution, single-attempt convergence |
| `test-compile-discover` | Compile/run separation, static child discovery, manifest+runtime |
| `test-mixed-model` | Multi-provider AI routing, `ai:` block, agentfn dispatch |
| `test-buggy-check` | Buggy-check relaxation, `BUGGY_CHECK.md`, check patching |
| `test-gap-blocked-input` | DependencyBackoffStrategy, input gap detection, producer→consumer |
| `test-gap-missing-output` | Output gap detection, TaskRunStrategy re-execution |
| `test-loop-detection` | Tool-call loop detection, LEARN.md augmentation |
| `test-multi-attempt` | Multi-attempt convergence, sequential check gates |
| `test-resume` | Crash-safe resume, incremental file creation |
| `test-seeding` | Recursive seed spawning (3 levels), `ctx.spawn()` |
| `test-seed-repair` | SeedScriptRepairStrategy, broken seed auto-fix |
| `test-queue-pattern` | Incremental do-while drain, discovery, convergence |
| `test-financial-deep-research` | Named non-default playbook, multi-level seed structure |
| `test-mixed-model` | Multi-provider `ai:` block, per-task provider/model config |

## Self-improvement-loop playbook

- **Run:** `converge run --playbook=self-improvement-loop --select improve+`
- **Source:** `.converge/playbooks/self-improvement-loop/` (`README.md`, `tasks/improve/TASK.md`, `tasks/improve/seeds/epoch.seed.js`, `scripts/*.mjs`)
- **Evidence:** `.converge/artifacts/self-improvement-loop/` — a per-playbook output dir owned by this playbook (`journal.md`, `metrics.jsonl`, `backlog.jsonl`, `touched-files.jsonl`, `epochs/<NNN>/verify/result.json`).
- **Gate failures:** dirty start → clean non-evidence diff; selection quality → `metrics.jsonl`/`touched-files.jsonl`; patch mismatch → manifest vs non-evidence `git diff`; weak verification → changed subsystem tests.

Full examples (heavier, multi-phase) live under `examples/`:
