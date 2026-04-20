# Architecture Analysis

## Current State

Converge is a gap-driven agent orchestration framework organized as a pnpm monorepo with 11 packages. The core package (`@converge/core`) contains ~280 TypeScript files across 40 modules (~84K lines). The framework's central abstraction is the convergence loop: evaluate gaps between current and desired state, plan work to close them, execute, verify with deterministic checks, and checkpoint for crash-safe resumption.

The execution model is hierarchical (Project > Epic > Goal > Task > Subtask) with filesystem-native state (YAML config, JSONL journals). AI provider integration is abstracted through `agentfn` with per-provider packages (claudefn, geminifn, kimifn, qwenfn, acpfn, openfn).

## Package Boundaries

**Well-separated today:**
- Agent provider packages (`agentfn`, `claudefn`, `geminifn`, etc.) are correctly isolated
- `codets` (code generation) and benchmark packages (`swebench`, `tbench`) are independent

**Should be split out of core:**

1. **`repair/`** (23 files, 30+ strategies) — This is a self-contained subsystem with its own strategy catalog, navigator, health checks, and skill templates. It has a clear interface (`RepairAgentRunner`) and could be `@converge/repair`. This would let users opt out of the repair system or replace it entirely.

2. **`journal/`** (25 files, 100+ event types) — The journaling system is a general-purpose structured logging/audit trail. It has reader, writer, navigator, formatter, and snapshot components. As `@converge/journal`, it could be reused independently and would reduce core's surface area.

3. **`cli/`** (28 files, several 30-50KB files) — The CLI is the largest module by file count. Extracting it to `@converge/cli` (importing core as a library) would enforce a clean library/application boundary. Currently the CLI contains significant business logic (e.g., `next-task.ts` at 52KB, `autonomous-run.ts` at 40KB) that blurs the line between framework and application.

4. **`playbook/`** (6 files) — Playbooks are an orchestration layer on top of the core task system. They could be a separate package that depends on core, letting users choose whether to adopt the playbook pattern.

5. **`plugins/`** (9 files, 6 builtins) — Built-in plugins (docker, eslint, git, nextjs, typescript, vitest) should live in their own packages or a `@converge/plugins` package rather than shipping with core.

## Responsibility Issues

1. **`config/task-definition.ts` (57KB)** — This single file defines TaskDefinition, ProjectDefinition, EpicDefinition, SubtaskDefinition, ChecklistDefinition, plus fluent builders, executor types, yields support, and WBS types. It's doing the work of at least 3-4 modules. The V2 Universal Unit architecture is ambitious but the implementation concentrates too many concerns.

2. **`cli/main.ts` (43KB) and `cli/next-task.ts` (52KB)** — These files contain orchestration logic that should live in core library modules, not CLI command handlers. The CLI should be a thin layer that calls into the framework.

3. **`executor/wbs-executor.ts` (49KB) and `executor/spawn-runner.ts` (36KB)** — These are large files with complex execution logic. The WBS executor in particular handles too many concerns: task decomposition, execution ordering, parallelism, and error handling.

4. **`gap/` vs `goal/` overlap** — Gap detection and goal evaluation are closely related but split across two modules. A gap is "what's wrong" and a goal is "what done looks like" — these could be unified or at least share more infrastructure.

5. **`meta/` and `evolve/`** — Both deal with self-improvement but are separate modules. `meta/analyzer.ts` generates improvement proposals, `evolve/evolve-runner.ts` executes them. The boundary is unclear — they should either merge or have a well-defined contract.

## API Shape

**What users would expect:**
- A small, focused core: define tasks, define checks, run to convergence
- Clear entry points: "here's my task definition, run it"
- Composable middleware/plugin model
- Simple programmatic API alongside CLI

**Current reality:**
- 100+ exports from the main entry point — overwhelming for new users
- Three entry points (`.`, `./planner`, `./client`) but the division isn't intuitive
- Fluent builders (`taskDef().name().description().executor()...`) are good but coexist with raw type construction, YAML loading, and markdown parsing — too many ways to define the same thing
- The gap/goal/check/eval/plan/task function taxonomy is powerful but has a steep learning curve. Users must understand 6 function types before they can be productive
- Missing: a "hello world" path. The simplest possible usage requires understanding too many concepts

**What competing frameworks do well:**
- LangGraph: small core (nodes + edges + state), everything else is optional
- CrewAI: role-based mental model, 3 concepts to start (Agent, Task, Crew)
- Prefect: decorator-based (`@task`, `@flow`), zero boilerplate for simple cases

**Recommendation:** Create a "porcelain" API layer — a simplified surface that covers 80% of use cases with 3-4 concepts, while the full 100+ export "plumbing" API remains available for power users.

## Composability

**Strengths:**
- Function registry pattern enables extension without modifying core
- Plugin system (ConvergePluginV2) provides lifecycle hooks
- AI factory abstracts provider switching cleanly
- Storage layer is pluggable (FilesystemStorage is one implementation)
- Repair strategies are individually pluggable (30+ strategies)

**Weaknesses:**
- The convergence loop (`orchestrator/convergence.ts`) is monolithic — you can't easily swap out the gap detection strategy or the execution strategy without replacing the whole orchestrator
- Journal format is tightly coupled to the 100+ event types enum — adding new event types requires modifying core
- Playbook format couples task discovery to a specific filesystem layout (`.converge/playbooks/{name}/tasks/`)
- The checkpoint system assumes filesystem storage — no abstraction for alternative backends
- Context objects (ProjectContext, EpicContext, TaskContext) bundle many APIs together — you can't provide a task context without also providing FileSystemAPI, ShellAPI, GitAPI, etc.

**Core size assessment:** At 40 modules and 280 files, the core is not small. Competing frameworks achieve similar functionality with 5-10 core modules. The large core makes it harder to understand, contribute to, and maintain.

## Top Recommendation

**Extract the CLI business logic into a proper library layer, then split core into core + repair + journal + cli.**

The single biggest architectural improvement is establishing a clean library boundary. Today, significant orchestration logic lives in CLI command handlers (`cli/main.ts`, `cli/next-task.ts`, `cli/autonomous-run.ts`, `cli/commands-run.ts` — together 166KB). This means:

1. Programmatic users can't access the full framework without the CLI
2. Testing requires simulating CLI invocations instead of calling library functions
3. The "core" package is actually "core + cli + repair + journal" — ~4 packages worth of code in one

**Concrete steps:**
1. Move orchestration logic from `cli/*.ts` into `runtime/` or a new `orchestration/` module
2. Make CLI files thin wrappers that parse args and call library functions
3. Extract `repair/` to `@converge/repair` (clear interface: RepairAgentRunner)
4. Extract `journal/` to `@converge/journal` (clear interface: Journal reader/writer)
5. Extract `cli/` to `@converge/cli` (depends on core, repair, journal)

This reduces core from 280 files to ~180 files, enforces clean module boundaries through package imports, and makes the framework genuinely embeddable. A user who wants just the convergence loop without the repair system or CLI can depend on `@converge/core` alone.

The gap-driven execution model is converge's differentiator. Making the core small enough to understand in an afternoon — while keeping the full power available through opt-in packages — would make it the obvious choice for teams building agent systems.
