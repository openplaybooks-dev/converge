# Converge glossary

The canonical name index for Converge. Two purposes:

1. **Authoritative names.** §2–§9 list every symbol, verb, env var, on-disk path, frontmatter field, concept, and RFC that is current today. If a name doesn't appear here (or appears in §10), it's not canonical.
2. **Scan-and-fix checklist.** §10 catalogs known legacy/drifted names with the canonical replacement and a ready-to-run `grep`. Each row is independently actionable: copy the grep, fix the hits, delete the row.

The grep convention used throughout: `--include='*.ts' --include='*.md' --include='*.json'` and `grep -v 'dist/'` to skip generated output. Add `--exclude-dir=.converge/playbooks/dbt-paradigm` when scanning the rename history playbook, which legitimately records old names.

---

## §1 How to use

- **Authoring docs / code / skills:** use names from §2–§9.
- **Reviewing existing files:** grep each row in §10 against the repo. If the row returns zero hits, delete it.
- **Encountering a name not in either column:** add a row to §10 (or a new entry to the relevant canonical section), with a `path:line` for traceability.

This file is a **pointer-of-truth**. The actual code is the truth; this file is the index. Every cited `path:line` should resolve.

---

## §2 Canonical APIs and types

Grouped by area. Every entry: `**Symbol** — path:line — purpose`. Only public surface a contributor would use directly is listed; internal helpers are not.

### Core builders and runtime
- **`taskDef()`** — `packages/core/src/config/task-definition.ts` — fluent builder for programmatic task definitions.
- **`TaskDefinition`, `TaskDefinitionBuilder`** — `packages/core/src/config/task-definition.ts` — programmatic task definition interface + builder.
- **`Playbook`, `PlaybookDef`** — `packages/core/src/playbook.ts`, `packages/core/src/task/playbook/types.ts:39` — playbook value object and its YAML schema.
- **`PlaybookGoal`, `PlaybookGoalStatus`, `PlaybookCheckEntry`** — `packages/core/src/task/playbook/types.ts:120,129,83` — goals/checks schema.
- **`RunResult`, `RunEvent`, `Reporter`** — `packages/core/src/run/index.ts` — execution output types.

### DAG and discovery
- **`TaskDag`** — `packages/core/src/dag/index.ts` — execution graph object.
- **`DagNode`, `DagNodeStatus`, `DagRunnerOpts`, `SpawnedChild`** — `packages/core/src/dag/index.ts` — node types and runner options.
- **`topologicalSort`, `detectCycle`, `executeDag`, `runDag`** — `packages/core/src/dag/index.ts` — DAG primitives.
- **`buildDagFromPlaybook`, `buildDagFromPlaybookObject`, `buildDagFromManifest`, `splitContainerNodes`, `injectRootNodes`** — `packages/core/src/config/declarative-loader.ts`, `packages/core/src/manifest/build-dag.ts` — compile-time DAG construction.
- **`PathRegistry`** — `packages/core/src/config/path-registry.ts` — ID → path resolver.
- **`DiscoveryScanner`, `DiscoveryWatcher`, `createDiscoveryScanner`, `createDiscoveryWatcher`** — `packages/core/src/task/discovery/scanner.ts`, `watcher.ts` — filesystem auto-discovery.
- **`discoverStaticChildren`** — `packages/core/src/task/discovery/static-children.js` — static child detection.

### Context (runtime surfaces for tasks)
- **`BaseContext`, `TaskContext`, `ProjectContext`** — `packages/core/src/context/types.ts:27,108,67` — execution contexts. See §3 for the field list.
- **`FileSystemAPI`, `ShellAPI`, `GitAPI`, `LoggerAPI`, `CheckAPI`, `EvalAPI`, `PlanAPI`, `PluginAPI`** — `packages/core/src/context/types.ts:144,174,217,244,314,268,289,332` — per-context API surfaces.
- **`JournalAPI`** — `packages/core/src/journal/types.ts` — read access to journal events and gaps.

### Inventory and spawn
- **`RuntimeTask`, `TaskRuntimeStatus`** — `packages/core/src/task/goal/runtime-ledger.ts:35,22` — one row in the inventory ledger.
- **`appendTaskUpsert`, `appendTaskStatus`, `readRuntimeLedgerState`, `runtimeLedgerDir`, `runtimeTasksPath`, `runtimeGoalsPath`** — `packages/core/src/task/goal/runtime-ledger.ts:262,266,270,318` — inventory mutation/read helpers.
- **`applyManifest`** — `packages/core/src/task/spawn/apply.ts` — ingests `spawn.plan.jsonl`, writes `spawn.plan.result.jsonl`, upserts `tasks.jsonl`. The RFC 0021 entry point.
- **`SpawnRow`, `SpawnResult`, `SpawnErrorCode`, `SpawnRowSchema`** — `packages/core/src/task/spawn/apply.ts` — manifest row schema and result codes.
- **`assertSafeId`** — `packages/core/src/task/goal/safe-id.ts` — id grammar validator (`[A-Za-z0-9_.-]`, max 200, no `..`).

### Gap framework
- **`Gap`, `GapSnapshot`, `GapType`, `CheckResult`, `EvalResult`, `ConvergenceState`, `CompactGap`** — `packages/core/src/task/gap/types.ts`, `packages/core/src/storage/types.ts` — gap detection types.
- **`GapDetector`, `ConvergenceAnalyzer`, `createGapDetector`, `createConvergenceAnalyzer`** — `packages/core/src/task/gap/detector.ts` — gap evaluation engine.
- **`createGap`, `resolveGap`, `filterByType`/`Level`/`Severity`, `prioritizeGaps`, `sortByPriority`, `toCompactGap`, `formatCompactGaps`, `calculateGapStats`** — `packages/core/src/task/gap/{utils.ts,types.ts}` — gap helpers.
- **`findDefinitionGaps`, `findHealthRepairGaps`** — `packages/core/src/task/gap/{definition-gaps.ts,health-repair-gaps.ts}` — specialized detectors.

### Hooks
- **`HookRegistry`, `globalHookRegistry`** — `packages/core/src/hooks/registry.ts` — lifecycle hook dispatcher.
- **`HookEvent`, `HookFn`, `HookPayloads`, `ConvergeHooks`, `HookRegistration`** — `packages/core/src/hooks/types.ts` — hook event types.
- **`hookDef`, `HookDefinitionBuilder`, `HookDefinition`, `HookContext`, `HookExecutorFn`, `HookFilter`** — `packages/core/src/hooks/hook-definition.ts` — tag-matched companion DAG nodes.
- **`gitCommitHook`, `prCreateHook`, `GitCommitHookConfig`, `PrCreateHookConfig`** — `packages/core/src/hooks/builtins/git.ts` — built-in hooks.

### Config and storage
- **`ConvergeConfig`, `DiscoveryConfig`, `RuntimeConfig`, `AIConfig`, `AIMultiProviderConfig`** + provider configs — `packages/core/src/config/types.ts` — project config schema.
- **`findConvergeConfig`, `loadConvergeConfig`, `resolveConvergeConfig`, `validateConvergeConfig`** — `packages/core/src/config/{loader,validator}.ts` — config readers.
- **`ProjectConfig`, `TaskConfig`, `TaskStatus`, `Checkpoint`, `ProvenanceRecord`, `StoragePaths`, `AIProviderConfig`** — `packages/core/src/storage/types.ts` — persistence schema.
- **`FilesystemStorage`, `createFilesystemStorage`** — `packages/core/src/storage/filesystem.ts` — disk-backed storage impl.
- **`StatusManager`, `ProvenanceManager`** — `packages/core/src/storage/{status,provenance}.ts` — per-task state.
- **`TaskStateManager`** — `packages/core/src/checkpoint/state.ts` — runstate snapshot management.

### Journal
- **`getJournalStructure`, `getEpicsDir`** — `packages/core/src/journal/structure.ts` — directory layout helpers.
- **`getTargetDir`, `getTargetManifestPath`, `getTargetRunstatePath`** — `packages/core/src/journal/structure.ts:71,86,94` — `.converge/journal/<pb>/` path resolvers.

### Validation
- **`ValidationIssue`, `PlaybookValidationResult`** — `packages/core/src/validation/types.ts` — validator output.

### Logging and hashing
- **`createLogger`, `createDefaultLogger`** — `packages/core/src/runtime/logger.ts` — structured logger factory.
- **`hashUpstream`** — `packages/core/src/hash/index.ts` — fingerprint hash for upstream state (RFC 0016).

---

## §3 Context APIs (what `ctx.*` exposes)

`BaseContext` is inherited by both `TaskContext` and `ProjectContext`. Per-context additions noted below.

| Field | Type | Defined at | Purpose |
|---|---|---|---|
| `ctx.projectDir` | `string` | `context/types.ts:29` | Project root absolute path. |
| `ctx.convergeDir` | `string` | `context/types.ts:32` | `<projectDir>/.converge/`. |
| `ctx.vars` | `Readonly<Record<string, unknown>>` | `context/types.ts:35` | Variables accessible at this level (merged from playbook + task + env). |
| `ctx.fs` | `FileSystemAPI` | `context/types.ts:38,144` | `read/write/exists/list/mkdir/rm/copy` (all promises). |
| `ctx.shell` | `ShellAPI` | `context/types.ts:41,174` | `exec(cmd, opts)`, `stream(cmd, opts)`. |
| `ctx.git` | `GitAPI` | `context/types.ts:44,217` | `getCurrentCommit/Branch`, `isClean`, `getModifiedFiles`, `getDiff`, `commit`. |
| `ctx.log` | `LoggerAPI` | `context/types.ts:47,244` | `debug/info/warn/error`, `child(prefix)`. |
| `ctx.check` | `CheckAPI` | `context/types.ts:56,314` | `run(name)`, `runAll()`, `validateOutputs()`. |
| `ctx.epicId` | `string` | `context/types.ts:53` | Epic identifier (journal subdir key). |
| `ctx.executionStack` | `ExecutionStackLevel[]` | `context/types.ts:50,97` | Cursor for nested execution (read-only). |
| **TaskContext additions** | | | |
| `ctx.taskId` | `string` | `context/types.ts:113` | This task's id. |
| `ctx.config` | `Readonly<TaskConfig>` | `context/types.ts:116` | Task config (frozen). |
| `ctx.status` | `Readonly<TaskStatus>` | `context/types.ts:119` | Runtime status. |
| `ctx.project` | `Readonly<ProjectContext>` | `context/types.ts:122` | Parent project context. |
| `ctx.journal` | `JournalAPI` | `context/types.ts:134` | Read access to journal events. |
| **ProjectContext additions** | | | |
| `ctx.config` | `Readonly<ProjectConfig>` | `context/types.ts:72` | Project config. |
| `ctx.eval` | `EvalAPI` | `context/types.ts:75,268` | `detectGaps`, `runChecks`, `getCurrentGaps`, `compareInvariants`. |
| `ctx.plan` | `PlanAPI` | `context/types.ts:78,289` | `generateTasks`, `getNextTasks`, `isComplete`, `getPlanPath`. |
| `ctx.plugins` | `PluginAPI` | `context/types.ts:81,332` | `getLoaded`, `has`, `getConfig`, `getChecks`, `getTaskTypes`. |

### No longer on `ctx`

| Removed | Replacement |
|---|---|
| `ctx.artifact` (was `ArtifactAPI` / `ArtifactStore`) | Declare files in TASK.md `outputs:`; write to `$CONVERGE_TASK_DIR` for per-task scratch (RFC 0021). |
| `ctx.goals` (Seed-only API) | The `converge goals` CLI verb writes sentinels at `.converge/inventory/<pb>/goals/<id>.done`. Read inventory directly. |
| `ctx.ai` / `ctx.ai.ask` / `ctx.ai.askJson` (Seed-only) | The body of `seed: { mode: cli }` is the prompt; the framework drives the AI. With the planned `seed:` removal (§10), use `converge apply` instead. |
| `ctx.spawn` (Seed-only) | `converge apply <manifest>` is the canonical mutator. |

---

## §4 CLI verbs

Source of truth: switch in `packages/cli/src/main.ts:750–1737`. Help text: `packages/cli/src/main.ts` lines ~430–470 and `packages/cli/src/help.ts`.

### Execute
| Verb | What it does |
|---|---|
| `run` | Execute tasks via the convergence loop. |
| `retry` | Re-run with `--resume`. |
| `stop` | Cancel a running execution. |
| `add` | Create a playbook from a prompt, example, or GitHub repo. |
| `plan` | Plan/preview a playbook. |

### Inspect
| Verb | What it does |
|---|---|
| `list` / `ls` | Print tasks by selection. |
| `show gantt`/`graph`/`journal`/`metrics`/`trend` | Visualize the playbook state. |
| `inspect` | Inspect execution sessions and tasks. |
| `status` | Show the current execution's task status. |
| `verify` | Re-run verification checks for completed tasks. |
| `metrics` | Emit execution metrics. |
| `docs` | Generate browsable HTML docs for a playbook. |

### Audit
| Verb | What it does |
|---|---|
| `doctor` | Workspace health check (definition gaps, stale sentinels, tripped circuits, malformed skills, config errors). |
| `playbook validate <name>` | Pre-flight validation of playbook.yml, SKILL.md, task files, goal checks. |
| `playbook list` | List available playbooks. |
| `playbook info <name>` | Show metadata + DAG summary. |
| `playbook history <name>` | Show execution history + trends. |

### Work catalog
| Verb | What it does |
|---|---|
| `goals list` | JSON array of goals with `done:bool` per goal. |
| `goals pending` | Pending goals only. |
| `goals next` | Next buildable goal. |
| `goals done <id>` | Re-validate goal checks; write sentinel if all pass. |
| `goals undone <id>` | Remove a goal's done sentinel. |
| `skills list` | Playbook-scoped skill catalog (iter-17+). |
| `tasks <subcommand>` | Task-state inspection (`wait-many`, etc.). |

### Infrastructure
| Verb | What it does |
|---|---|
| `init` | Scaffold a new project. |
| `clean` | Reset task state and journal subtrees. |
| `reset <playbook> [task]` | Reset a playbook's state, or a single task. |
| `build` | Build a playbook's tasks. |
| `compile` | Compile a playbook for validation. |
| `test` | Run tests / checks. |
| `apply <manifest>` | **Canonical** spawn mutator (RFC 0021). Ingests `spawn.plan.jsonl`. |
| `spawn` | Build/validate explicit seed spawn commands. **Legacy form** (see §10); prefer `apply`. |
| `render` | Render a template file with var substitution. |
| `deps list` / `deps install` | Manage skill dependencies. |

### Selection flags (apply to most verbs)
- `--select`, `-s <expr>` — select tasks by id/tag/status/graph-operator.
- `--exclude`, `-e <expr>` — subtract from selection.
- `--selector <name>` — shortcut for `--select selector:NAME`.
- `--state=PATH` — path to a prior `manifest.json` (used by `list` predicates and `run --defer`).
- `--defer` — pre-mark unchanged tasks complete from a prior run (with `--state`).

---

## §5 Environment variables

Source of truth: `grep 'process\.env\.CONVERGE_\|process\.env\.ANTHROPIC_' -r packages/`.

### Playbook / workspace context
| Var | Purpose |
|---|---|
| `CONVERGE_WORKSPACE` | Project root (default: cwd). |
| `CONVERGE_PLAYBOOK` | Active playbook name. |
| `CONVERGE_PLAYBOOK_DIR` | Playbook directory absolute path. |
| `CONVERGE_PROJECT_DIR` | Project root (alias surface; same as workspace). |
| `CONVERGE_PATH` | `PATH` augmentation for spawned shells. |
| `CONVERGE_JOURNAL_ROOT` | Override journal root path. |
| `CONVERGE_TARGET_DIR` | Override the entire target/journal directory (`.converge/journal/<pb>/`). |

### Per-task execution
| Var | Purpose |
|---|---|
| `CONVERGE_TASK_ID` | Current task's id. |
| `CONVERGE_TASK_DIR` | Per-task execution dir (`<journal>/tasks/<id>/exec/`); RFC 0021. |
| `CONVERGE_CURRENT_TASK_PATH` | Full TASK.md path (relative to project). |
| `CONVERGE_TASK_ATTEMPT` | Current attempt number (zero-padded). |
| `CONVERGE_TASK_ATTEMPT_DIR` | This attempt's directory. |
| `CONVERGE_TASK_WAVE` | Wave counter. |
| `CONVERGE_TASK_WAVE_SOURCE` | Source of the wave value (`cli` / `seed` / `external`). |
| `CONVERGE_TASK_WAVE_EXTERNAL` | External wave override. |
| `CONVERGE_EPIC_ID` | Epic identifier; journal grouping key. |
| `CONVERGE_EXECUTION_ID` | Execution session id. |
| `CONVERGE_WORKER_ID` | Worker id (for distributed runs). |

### Var inheritance
| Var | Purpose |
|---|---|
| `CONVERGE_VAR_*` | Auto-prefixed env per declared `vars:` entry; ferries vars to subprocess bodies. |

### Diagnostics
| Var | Purpose |
|---|---|
| `CONVERGE_DEBUG` | Enable debug logging. |
| `CONVERGE_DEBUG_DEPS` | Debug dependency resolution. |
| `CONVERGE_DEBUG_ENV` | Debug env-var assembly. |
| `CONVERGE_DEBUG_FIND_NEXT` | Debug next-task selection. |
| `CONVERGE_DEBUG_LOG` | Debug log file path. |
| `CONVERGE_VERBOSE` | Verbose CLI output. |

### Runtime config
| Var | Purpose |
|---|---|
| `CONVERGE_RESUME` | Resume prior execution. |
| `CONVERGE_RESTART` | Restart from scratch. |
| `CONVERGE_STALE_LOCK_MS` | Stale lock timeout (default 30000). |
| `CONVERGE_ALLOW_MISSING_ENV` | Allow missing env vars in config (dry-run). |
| `CONVERGE_ALLOW_SKILL_SIMULATION` | Enable skill simulation mode. |
| `CONVERGE_ALLOW_FORCE_DONE` | Required `=1` to use `converge goals done --force`. |
| `CONVERGE_TASKDEF_CACHE_MAX` | Max task-definition cache entries. |
| `CONVERGE_BIN` | Path to converge binary. |
| `CONVERGE_CONTEXT_JSON` | Injected context (internal). |
| `CONVERGE_STUB_RESPONSE` | Stubbed AI response (testing). |
| `CONVERGE_STUB_TASK_ID` | Stubbed task id (testing). |

### Internal channels
- `CONVERGE_EVENT_WRITER__`, `CONVERGE_EXECUTION_LOGGER__`, `CONVERGE_LAST_BAIL__` — internal IPC. Don't read or set in user code.

### AI provider
| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key. |
| `ANTHROPIC_BASE_URL` | API endpoint override (optional). |

---

## §6 On-disk directory schema

Canonical layout under `.converge/`. Anything not listed here is not framework-managed (per-playbook output directories are the playbook author's choice; see drift table for `artifacts/`).

```
.converge/
├── project.yml          # project config (alt: project.yaml)
├── PROJECT.md           # alt project def (markdown form)
├── playbooks/<name>/    # SOURCE BLUEPRINT (never written by runtime)
│   ├── playbook.yml
│   ├── PLAN.md          # optional
│   ├── tasks/<id>/TASK.md
│   ├── templates/<name>/TASK.md
│   └── skills/<name>/SKILL.md   # playbook-scoped skills
├── journal/<playbook>/  # RUNTIME EVIDENCE (overwritten each run)
│   ├── manifest.json            # compiled DAG (source: declarative-loader)
│   ├── manifest.prev.json       # previous compile for diffing
│   ├── runstate.json            # current execution snapshot
│   ├── runstate.prev.json       # previous run for diffing
│   ├── events.jsonl             # cross-task event stream
│   ├── trends.jsonl             # one entry per run (summary)
│   └── tasks/<id>/
│       ├── TASK.md              # rendered task (var-substituted)
│       ├── exec/                # $CONVERGE_TASK_DIR (RFC 0021)
│       │   ├── spawn.plan.jsonl
│       │   └── spawn.plan.result.jsonl
│       └── attempts/<NN>/
│           ├── TASK.md          # snapshot
│           ├── CHECK.md
│           ├── EVIDENCE.json
│           ├── attempt.json
│           ├── seed-input.json  # only if mode:cli seed (legacy; see §10)
│           ├── seed-output.json
│           └── logs/
│               ├── events.jsonl
│               └── log.log
├── inventory/<playbook>/  # TASK LEDGER (append-only)
│   ├── tasks.jsonl                  # one JSON row per task
│   ├── goals.jsonl                  # one JSON row per goal event
│   ├── goals-snapshot.json
│   ├── goals/<id>.done              # goal-done sentinels
│   └── spawned/<id>/TASK.md         # spawned task definitions
└── tmp/                   # ephemeral scratch
```

### Top-level dir purposes

- **`project.yml` / `PROJECT.md`** — project-level config (AI provider, plugins, hooks, runtime limits). One of the two; YAML form is canonical.
- **`playbooks/<name>/`** — immutable source blueprint. Edit here. The runtime never writes into this tree.
- **`journal/<playbook>/`** — single source of truth for execution state. Overwritten on each run. Same dir as `getTargetDir()` returns.
- **`inventory/<playbook>/`** — append-only task ledger; survives across runs. The runtime registry for dynamically spawned tasks.
- **`tmp/`** — ephemeral scratch (locks, pipes, intermediate files). Safe to delete between runs.

### Directories that look canonical but aren't

| Path | Truth |
|---|---|
| `.converge/artifacts/` | **Not framework state.** Removed in May 2026 cleanup. Per-playbook output dirs may live here (e.g., `self-improvement-loop` writes there) — that's the playbook's choice, not framework convention. |
| `.converge/epics/` | **Legacy.** Replaced by `journal/<playbook>/tasks/` for nesting; the surviving uses are in old tests and `examples/context-chain-demo.ts:26`. See §10. |
| `.converge/target/` | **Internal alias.** `getTargetDir()` returns `journal/<playbook>/` by default; the literal `target/` segment only appears if `CONVERGE_TARGET_DIR` env var is set. |
| `.converge/cache/`, `.converge/logs/`, `.converge/state/`, `.converge/checkpoints/` | **Never existed.** If you see these, they're invented. |

---

## §7 Frontmatter fields

### TASK.md frontmatter

Source of truth: `TaskMdDef` and `TaskMdShape` in `packages/core/src/config/task-md-definition.ts:122,168`. Parser: `parseTaskMd` (line 1100+).

| Field | Type | Aliases | Notes |
|---|---|---|---|
| `id` | `string` | `name` (deprecated) | Required; must pass `assertSafeId`. |
| `title` | `string` | — | Human label. |
| `description` | `string` | — | Free text. |
| `skills` | `string[]` | `skill` (singular accepted) | SKILL.md references. |
| `executor` | `{ type, path?, args?, env? }` | — | `type: "ai" \| "script" \| "function"`. |
| `tests` | `CheckDef[]` | `checks`, `needs` | **Canonical**: `tests:`. The loader rejects mixing `tests:` + `checks:` (`task-md-definition.ts:1102`). |
| `inputs` | `string[]` | — | File globs the task reads. |
| `outputs` | `string[]` | — | File globs the task produces. |
| `depends_on` | `string[]` | `requires` | Sibling task ids. |
| `tags` | `string[]` | — | Filter/selector keys. |
| `vars` | `Record<string, unknown>` | — | Per-task variable overrides. |
| `agent` | `string` | — | Provider/model shorthand. |
| `ai` | `Record<string, unknown>` | — | Per-task AI config (provider, model, timeoutMs, maxRetries, allowedTools, options). |
| `plan` | `{ prompt?, output?, outputPrompt? }` | — | Plan-mode config. |
| `materials` | `string[]` | — | Material files for AI context. |
| `materialization` | `string` | — | Material substitution config. |
| `diagnosis-hints` | `DiagnosisHint[]` | — | Repair-loop hints. |
| `correction-budget` | `number` | — | Max attempts on failure. |
| `context-depth` | `number` | — | Context window depth. |
| `context` | `SkillContextStep[]` | — | Context interpolation steps. |
| `auto-converge` | `boolean \| AutoConvergePolicy` | — | Auto-convergence policy. |
| `allowed-tools` | `string[]` | — | Restrict available tools. |
| `on-fail` | `{ reset?: string[] }` | — | Reset actions on failure. |
| `passthrough` | `boolean` | — | Skip AI; run body's shell commands directly. |
| `blocking` | `boolean` | — | Whether task blocks downstream. |
| `from_seed` | `string` | — | Set on children spawned by a parent's seed; identifies the parent. |
| `retry-full-body` | `boolean` | — | Always re-send full body on retry (never use gap-detection shortcut). |
| `converge` | `{ prompt?, cmd? }` | — | Do-while loop config (runs after main body). |
| `spawns` | `TaskMdSpawnSpec[]` | — | Declarative child-task list (alternative to seed-driven spawning). |
| `seed` | `{ mode: "cli" }` | — | **Legacy form (see §10).** Only `mode: "cli"` is parsed; canonical replacement is `converge apply`. |

### playbook.yml schema

Source of truth: `PlaybookDef` in `packages/core/src/task/playbook/types.ts:39`.

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | Required; playbook identifier. |
| `description` | `string` | Optional. |
| `seed_api_version` | `number` | Seeding API version (v1 for strict CLI). |
| `key` | `string` | Distinguishes runs (becomes part of `epicId`). |
| `inputs` | `Record<string, PlaybookInput>` | Each: `{ description?, required?, default? }`. |
| `run` | `PlaybookRunConfig` | `{ mode?, workers?, resume?, stall?, maxTaskAttempts?, maxIterations?, maxDuration?, maxGoals? }`. |
| `goals` | `PlaybookGoal[]` | Each: `{ id, description?, parent?, depends_on?, status?, source?, metadata?, checks? }`. |
| `tasks` | `PlaybookTask[]` | Each: `{ id?, path?, playbook?, depends_on?, with? }`. Used for cross-playbook composition. |
| `hooks` | `HookDefinition[]` | Tag-matched companion DAG nodes. |
| `checks` | `PlaybookCheckEntry[]` | Top-level checks: `{ id, cmd, type?, description? }`. |

---

## §8 Core concepts (vocabulary)

Alphabetical. Cross-links go to canonical defs.

- **Attempt** — one execution pass of a task. Lives at `journal/<pb>/tasks/<id>/attempts/<NN>/`. Each attempt has its own snapshot (`TASK.md`, `CHECK.md`, `EVIDENCE.json`, logs).
- **Check** — deterministic verification command listed under `tests:` in TASK.md. Exit 0 = pass. Different from `ctx.check.run()` (the API) and `converge test` (the CLI verb). Canonical doc: `docs/concepts/deterministic-checks.md`.
- **Circuit breaker** — stop condition (fail-fast on repeated failure of the same gap). Resets via `converge doctor --fix`.
- **Container** — task with children. Has diverge-node and converge-node split in the DAG.
- **Convergence** — the diverge → execute → converge feedback loop at every task level. Recursive. Canonical doc: `docs/concepts/convergence.md`.
- **DAG node** — runtime node in the execution graph. Built from playbook.yml + task definitions by `buildDagFromPlaybook`. Replaces the older surface term "epic" in most contexts.
- **Diverge** — parent spawns sub-tasks (statically declared, or dynamically via `converge apply` / legacy seed).
- **Epic** — *internal grouping*; survives in `CONVERGE_EPIC_ID` env var and `journal/epics/` (cross-playbook). As a surface noun it's mostly retired — use "DAG node" or "task".
- **Epoch** — recurring loop body; runs until goals converge or budget exhausted. Used in self-improvement playbooks. RFC 0022.
- **Evidence** — `EVIDENCE.json` per attempt; captures check outcomes and gap logs.
- **Fingerprint** — hash of upstream state used for idempotency and caching. RFC 0016.
- **Gap** — mismatch between current and target state (missing input, missing output, failed check). Drives the repair loop.
- **Gateway** — task mode (RFC 0022) where a passthrough parent guards downstream.
- **Inventory** — `.converge/inventory/<pb>/`; append-only task ledger (`tasks.jsonl`) + spawned task definitions. The runtime registry.
- **Journal** — `.converge/journal/<pb>/`; per-run mutable evidence (manifest, runstate, attempts, events). Overwritten each run.
- **Leaf** — task with no children; executes directly.
- **Ledger** — append-only JSONL log (`tasks.jsonl`, `goals.jsonl`). Append-only is the property; "inventory" is the directory.
- **Manifest** — ambiguous. Two senses:
  - `manifest.json` (compiled DAG) — `journal/<pb>/manifest.json`.
  - `spawn.plan.jsonl` (spawn manifest) — `<task-exec-dir>/spawn.plan.jsonl`; RFC 0021.
  Use the qualified term in writing.
- **Navigator** — component that picks the next executable task (respects DAG, gates, gaps). `packages/core/src/navigator/`.
- **Passthrough** — container task whose body is empty; it exists only to spawn and converge children. `passthrough: true` in TASK.md.
- **Playbook** — durable unit of work; `playbook.yml` + tasks/templates/skills under `.converge/playbooks/<name>/`. Canonical doc: `docs/concepts/playbook.md`.
- **RFC** — Request For Comment; design proposal under `docs/rfcs/00NN-*.md`. "Draft" status in frontmatter doesn't mean unimplemented — see §9.
- **Runstate** — `runstate.json`; current execution snapshot (task checksums, status, attempt counts). NOT `checkpoint.json` (legacy name).
- **Sentinel** — marker file (e.g., `<id>.done`) that records completion. Goal sentinels live at `inventory/<pb>/goals/<id>.done`.
- **Skill** — reusable `SKILL.md` catalog entry; playbook-scoped (`<pb>/skills/<name>/`), project-scoped (`.claude/skills/`), or user-scoped. `converge skills list` enumerates them.
- **Spawn** — emit a child task into the runtime ledger. Canonical surface: `converge apply <manifest>` (RFC 0021).
- **Spawner / Converger / Gateway / Leaf** — task modes from RFC 0022 (in progress).
- **Task** — ambiguous. Three senses, usually clear from context:
  - The `.converge/playbooks/<pb>/tasks/<id>/TASK.md` unit (definition).
  - The runtime DAG node executing that unit.
  - The `converge tasks` CLI subcommand surface.
- **Template** — reusable `TASK.md` under `templates/`; not directly executable. Spawn manifests reference these by path.
- **Wave** — execution-pass counter (`CONVERGE_TASK_WAVE`). Increments per child set spawned; controls loop termination.

### Ambiguous terms — disambiguation guide

| Word | Senses | Canonical when ambiguous |
|---|---|---|
| "manifest" | compiled DAG / spawn manifest | `manifest.json` vs `spawn.plan.jsonl` (always qualify) |
| "task" | definition / runtime node / CLI verb | qualify with "TASK.md" / "DAG node" / "`converge tasks`" |
| "skill" | SKILL.md catalog / Claude Code user skill | qualify with "playbook-scoped skill" |
| "check" | `tests:` entry / `ctx.check.run()` / `converge test` verb | qualify with "test entry" / "check API" / "test verb" |
| "convergence" | the loop / framework name / RFC 0020 bug | qualify with "convergence loop" / "Converge (framework)" / "container convergence bug" |
| "epic" | env var / journal subdir / legacy surface | use "DAG node" or "task" in surface writing; only use "epic" for the env var or journal path. |

---

## §9 RFC status matrix

Source: `docs/rfcs/0001-*.md` through `docs/rfcs/0022-*.md`. **"Draft" in the frontmatter ≠ unimplemented.** Use the "Implemented?" column to know what's real.

| # | Title | Status | Implemented? |
|---|---|---|---|
| 0001 | Compile-time cross-template var validator | Draft | No |
| 0002 | Structured JSON spawn protocol | Draft | Superseded by 0021 |
| 0003 | Three-tier error classification + retry policies | Draft | Partial |
| 0004 | Partitioned, indexed journal | Draft | Partial (per-attempt dir lives) |
| 0005 | Frontier checkpoint for fast resume | Draft | No |
| 0006 | Pre-flight cost estimation | Draft | No |
| 0007 | Distributed worker boundary | Draft | Partial |
| 0008 | Skill discovery API | Draft | Partial (iter-17+) |
| 0009 | Structured retry context | Draft | Partial |
| 0010 | Typed lessons (replace LEARN.md prose) | Draft | No |
| 0011 | Live observability dashboard | Draft | No |
| 0012 | Doctor as a pre-flight phase | Draft | Partial |
| 0013 | Surgical reset with cascade semantics | Draft | Yes |
| 0014 | Playbook-as-versioned-package | Draft | Partial |
| 0015 | Hot-reload TASK.md edits | Draft | No |
| 0016 | Idempotency tokens on spawns | Draft | Yes (fingerprint) |
| 0017 | Successor contract (`on_fail:`) | Draft | No |
| 0018 | Cost & token telemetry per task | Draft | Partial |
| 0019 | Per-attempt snapshot bundles | Draft | Partial |
| 0020 | Container convergence detection bug | Draft | **Yes** (commit `689a6c783`) |
| 0021 | Declarative spawn manifests + per-task exec dir | Draft | **Yes** (`converge apply`, `$CONVERGE_TASK_DIR` live) |
| 0022 | Task mode contract | Draft | In progress |

---

## §10 Legacy → canonical drift table

Each row is a grep-and-fix unit. Run the grep; fix the hits; delete the row. The "Still appears at" column is a snapshot — re-run the grep to refresh.

Standard exclusions on every grep: `--include='*.ts' --include='*.md' --include='*.json'` and `grep -v 'dist/'` (skip generated). Add `--exclude-dir=.converge/playbooks/dbt-paradigm` when scanning the rename history playbook.

### A. Wbs → Seed type renames

| Legacy | Canonical | Still appears at | Grep |
|---|---|---|---|
| `WbsFn` | `SeedFn` *(itself legacy — see §10/E)* | none (clean as of last verification) | `grep -rn 'WbsFn' --include='*.ts' --include='*.md' . \| grep -v dist/ \| grep -v dbt-paradigm` |
| `WbsContext` | `SeedContext` *(itself legacy — see §10/E)* | none (clean as of last verification) | `grep -rn 'WbsContext' ... \| grep -v dbt-paradigm` |
| `WbsExecutor` | `SeedExecutor` (the executor object) | `.converge/playbooks/cli-redesign/tasks/02-compile-and-list/{TASK.md:157, 04-compile-seed/TASK.md:39, 02-green/TASK.md:5,33}` | `grep -rn 'WbsExecutor' ... \| grep -v dbt-paradigm` |
| `WbsSpawnTarget` | `SeedSpawnTarget` *(itself legacy — see §10/E)* | `docs/advanced/05-runtime-hygiene.md:152` (live code snippet) | `grep -rn 'WbsSpawnTarget' ... \| grep -v dbt-paradigm` |
| `TaskMdWbs` | `TaskMdSeed` | none currently (already clean) | `grep -rn 'TaskMdWbs' ... \| grep -v dbt-paradigm` |
| `createScriptWbsFn`, `createAiWbsFn` | (removed; only `createCliSeedFn` ever existed post-rename — and that's itself legacy per §10/E) | none | `grep -rn 'createScriptWbsFn\\|createAiWbsFn' ... \| grep -v dbt-paradigm` |

### B. Deleted `artifacts` module

| Legacy | Canonical | Still appears at | Grep |
|---|---|---|---|
| `ctx.artifact` | (deleted; use TASK.md `outputs:` + `$CONVERGE_TASK_DIR`) | none in source | `grep -rn 'ctx\.artifact\b' --include='*.ts' --include='*.md' . \| grep -v dist/` |
| `ArtifactAPI`, `ArtifactStore` | (deleted) | none in source; `packages/core/docs/proposals/self-developing-harness.md` is a historical Draft proposal that references them — leave or rewrite when the proposal is revisited. | `grep -rn 'ArtifactAPI\\|ArtifactStore' ... \| grep -v dist/` |
| `.converge/artifacts/` *(framework path)* | `.converge/inventory/` (for goals/spawned ledger). Per-playbook output dirs may legitimately live at `.converge/artifacts/<pb>/` — that's the playbook's choice, not framework convention. The `self-improvement-loop` playbook is an intentional case. | `self-improvement-loop` evidence dir (intentional); doc-comments already cleaned | `grep -rn '\.converge/artifacts' --include='*.ts' --include='*.md' . \| grep -v dist/` |
| `phantomWorkItems`, `contradictoryFindings`, `reconcileAllSprints`, `findPhantomWorkItems` | (deleted with sprint reconciliation; no replacement) | none in source | `grep -rn 'phantomWorkItems\\|contradictoryFindings\\|reconcileAllSprints\\|findPhantomWorkItems' ... \| grep -v dist/` |

### C. On-disk path renames

| Legacy | Canonical | Still appears at | Grep |
|---|---|---|---|
| `.converge/epics/` | `.converge/journal/<playbook>/tasks/` (for per-task nesting); the env var `CONVERGE_EPIC_ID` and `journal/epics/` (cross-playbook) survive. | `examples/context-chain-demo.ts:26`; `packages/core/tests/tree/tree-display-running-task.test.ts` (many lines); `packages/core/tests/tree/tree-next-task-constraint.test.ts` (many lines); `packages/core/tests/README.md:224,228` | `grep -rn '\.converge/epics/' --include='*.ts' --include='*.md' . \| grep -v dist/` |
| `checkpoint.json` | `runstate.json` | check docs | `grep -rn 'checkpoint\.json' --include='*.ts' --include='*.md' . \| grep -v dist/` |

### D. CLI verb migrations (RFC 0021)

| Legacy | Canonical | Still appears at | Grep |
|---|---|---|---|
| `converge spawn template --path X --var k=v` | `converge apply $CONVERGE_TASK_DIR/spawn.plan.jsonl` (RFC 0021) | skill-tree divergence between `.claude/skills/converge-planning/SKILL.md` and `skills/converge-planning/SKILL.md` — see §11 | `grep -rn 'converge spawn template' --include='*.ts' --include='*.md' .` |
| `converge spawn task --task-file ... --id ...` | `converge apply` (legacy flag form kept for compat) | (same skill divergence) | `grep -rn 'converge spawn task' --include='*.ts' --include='*.md' .` |
| "resume checkpoint" terminology | "fingerprint caching" (RFC 0016) | check docs | `grep -rn 'resume checkpoint' --include='*.md' .` |

### E. `seed:` and Seed-related types (planned removal)

The `seed: { mode: cli }` frontmatter field, `SeedFn`, `SeedContext`, `SeedSpawnTarget`, and `createCliSeedFn` are scheduled for removal. The canonical replacement is `converge apply` (RFC 0021). The parser at `packages/core/src/config/task-md-definition.ts:800` still accepts `seed: { mode: cli }` today, and one live playbook uses it (`generate-docs/tasks/08-reference/TASK.md:8`); both are migration targets.

| Legacy | Canonical | Still appears at | Grep |
|---|---|---|---|
| `seed: { mode: cli }` (TASK.md frontmatter) | `converge apply <manifest>` (RFC 0021) — body writes JSONL, runs apply | `.converge/playbooks/generate-docs/tasks/08-reference/TASK.md:8`; `tests/test-queue-pattern/.converge/playbooks/default/tasks/02-drain-epochs/TASK.md:6`; `tests/test-financial-deep-research/.converge/playbooks/test-structure/TASK.md:4`; `examples/evolutionary-optimization/.converge/playbooks/tasks/TASK.md:3`, `templates/evaluate-batch/TASK.md:4`; `examples/scientific-research/.converge/playbooks/TASK.md:4`; docs: `docs/design/progressive-decomposition.md:189`, `docs/guides/build-a-software-project.md:92`, `docs/concepts/dynamic-work-breakdown.md:119`, `docs/reference/task-md.md:28,112` | `grep -rEn '^seed:' --include='*.md' .` |
| `seeds:` (plural; already removed at the parser) | `seed: { mode: cli }` — and that's also slated for removal (above). Plural form throws at `task-md-definition.ts:735`. | check docs for stale references | `grep -rn '^seeds:' --include='*.md' .` |
| `seed: { script: ... }` (JS-script seed form) | Never landed in current code; parser only accepts `mode === "cli"` at `task-md-definition.ts:804`. If you see this in docs, fix the doc. | check docs | `grep -rn 'seed:' -A3 --include='*.md' . \| grep 'script:'` |
| `SeedFn` (type) | (legacy; will be removed with `seed:`) | `packages/core/src/config/task-definition.ts:1143` (declaration), `task-md-definition.ts:24,566`, `task/unit/unit.ts:20,82`, `executor/seed-executor.ts:23,174`, `index.ts:331` (re-export); plus tests | `grep -rn '\bSeedFn\b' --include='*.ts' . \| grep -v dist/` |
| `SeedContext` (type) | (legacy; will be removed with `seed:`) | `packages/core/src/config/task-definition.ts:964`, `cli-seed-executor.ts:5,26`, `seed/cli-spawn.ts:2`, several test refs | `grep -rn '\bSeedContext\b' --include='*.ts' . \| grep -v dist/` |
| `SeedSpawnTarget`, `SeedSpawnOptions` (types) | (legacy; will be removed with `seed:`) | `packages/core/src/config/task-definition.ts:885,926` | `grep -rn 'SeedSpawnTarget\\|SeedSpawnOptions' --include='*.ts' . \| grep -v dist/` |
| `createCliSeedFn` | (legacy; will be removed with `seed:`) | `packages/core/src/executor/cli-seed-executor.ts:25`, `task-md-definition.ts:37,568`, `executor/index.ts:11`, `index.ts:678` | `grep -rn 'createCliSeedFn' --include='*.ts' . \| grep -v dist/` |
| `from_seed:` (frontmatter; child-side label) | **TBD** with the `seed:` removal. The field marks "this child was produced by a parent's seed/spawn"; the post-`seed:` equivalent is the inventory row's `parent` field. | playbooks that use spawned children: search before removing. | `grep -rn '^from_seed:\\|"from_seed"' --include='*.md' --include='*.ts' . \| grep -v dist/` |
| `ctx.spawn`, `ctx.ai.ask`, `ctx.ai.askJson`, `ctx.goals.*` (Seed-context APIs) | (legacy; will be removed with `seed:`) — author the parent body as a shell script that writes `spawn.plan.jsonl` and runs `converge apply` | `packages/core/src/config/task-definition.ts:806,1021,1048,1055`; doc references in `docs/concepts/dynamic-work-breakdown.md` | `grep -rn 'ctx\.spawn\|ctx\.ai\.ask\|ctx\.goals\.' --include='*.ts' --include='*.md' . \| grep -v dist/` |

### F. Historical artifacts and intentional records

These appear in the repo and are **not drift** — leave alone:

- `.converge/playbooks/dbt-paradigm/*` — the rename-history playbook. Records the Wbs→Seed migration. Exclude with `--exclude-dir=.converge/playbooks/dbt-paradigm`.
- `.converge/playbooks/cli-redesign/*` — historical CLI redesign playbook. The `WbsExecutor` refs there should be fixed to `SeedExecutor` if they're going to drive future work; if archived, leave alone.
- `CONVERGE_EPIC_ID` env var, `journal/epics/` directory — kept for cross-playbook grouping. Use "epic" only in this technical context.

---

## §11 Skill-tree divergence

Three parallel skill trees exist:

- `skills/` — repo-root, source of truth.
- `.claude/skills/` — Claude Code project-scoped surface.
- `packages/cli/skills/` — bundled into the published CLI by `prepublishOnly` (`cp -r ../../skills ./skills`).

Keep them identical. To verify:

```bash
diff -r skills/ .claude/skills/
diff -r skills/ packages/cli/skills/
```

To resync from `skills/` (the canonical):

```bash
cp -r skills/. .claude/skills/
cp -r skills/. packages/cli/skills/
```

Known divergence as of this writing: `converge-planning/SKILL.md` references old `converge spawn template/task` syntax in `.claude/skills/` but the new `converge apply` syntax in `skills/`. Fix with the resync above (after confirming `skills/` is what you want).

---

## §12 Maintenance

- New canonical name: add to the relevant §2–§9 section.
- New deprecation: add a row to §10. Include the canonical replacement and a grep command. Don't delete the legacy name from the codebase yet — that's the row's purpose.
- Drift row returns zero hits: delete the row.
- Spotted a name not in either column: add it to §10 with a note `(investigate)` if unsure which side it belongs on.

This file is the index. The cited `path:line` references are the truth. If they don't match, the file is stale — fix the file.
