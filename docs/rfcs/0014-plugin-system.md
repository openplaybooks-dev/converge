---
name: "0014-plugin-system"
description: "Comprehensive plugin system: lifecycle hooks, interceptor middleware, custom check types, skill sources, journal consumers, provider plugins, CLI commands, and capabilities declaration"
status: accepted
author: minhlucvan
created: 2026-05-25
updated: 2026-05-25
repository: https://github.com/openplaybooks-dev/converge
tags:
  - architecture
  - plugins
  - providers
  - hooks
  - extensibility
---

# RFC-0014: Converge Plugin System

## Summary

Allow Converge to be extended via installable plugins that hook deeply into every framework behavior. Plugins can:

1. **Observe** lifecycle events (fire-and-forget hooks)
2. **Intercept** framework operations (middleware that can modify inputs/outputs or block execution)
3. **Register** custom implementations (check types, skill sources, provider factories, CLI commands)
4. **Export** telemetry (journal event consumers)

Provider plugins (acp, claude, kimi) are one feature of this system, not the whole story. The plugin API surfaces extension points across the task execution pipeline, check evaluation, DAG compilation, skill resolution, error classification, journal/telemetry, and CLI.

## Motivation

### Provider decoupling (original motivation)

Providers are hardcoded as if/else branches in `packages/agentfn/src/agentfn.ts`. Users cannot install providers post-init, and the system has no concept of optional dependencies. The `ERR_MODULE_NOT_FOUND` error for `@anthropic-ai/claude-agent-sdk` proved that eager loading of provider dependencies breaks the install experience.

### Deep extensibility (expanded motivation)

The framework has rich internal systems — check evaluation, DAG compilation, skill resolution, error classification, journal/telemetry — but none are extensible by plugins. The `PluginAPIV2` types already declare registration methods for checks, evals, plans, tasks, hooks, and tools, but critical wiring gaps prevent plugins from actually affecting framework behavior:

1. **Plugin hooks are orphaned** — `loadPluginsV2()` populates `PluginStateV2.hooks`, but no code imports these hooks into the `HookRegistry` that orchestrators fire. Plugin hooks have zero effect at runtime.
2. **Only 11/28 typed hook events are emitted** — Many events (`task:retry`, `task:skip`, `project:complete`, all background/sidecar/schedule events, lifecycle phases, `cohort:complete`) are defined but never fired.
3. **No interceptor pattern** — `HookRegistry.fire()` is fire-and-forget. Plugins can observe but cannot modify task execution, check evaluation, DAG compilation, or error classification.
4. **No per-system registries** — Check types, skill sources, and journal consumers have no plugin-facing registration APIs.

This RFC addresses all of these gaps.

## Design Overview

The plugin system has four layers, each building on the previous:

```
Layer 4: Per-System Registries (check types, skill sources, journal consumers, CLI commands)
Layer 3: Interceptors (middleware chains that modify framework behavior)
Layer 2: Lifecycle Hooks (fire-and-forget observation of 28 events)
Layer 1: Foundation (plugin loading, wiring, state management)
```

---

## Phase 0: Fix Broken Hook Wiring (Foundation)

### Problem

`loadPluginsV2()` in `packages/core/src/plugins/loader.ts` stores hooks in `PluginStateV2.hooks`. The CLI in `packages/cli/src/main.ts` creates a `HookRegistry` with user hooks from `converge.ts` config but never imports plugin hooks. `HookRegistry.importFromPluginState()` exists but has zero call sites.

### Fix

**`packages/cli/src/main.ts`**: After loading plugins, bridge plugin hooks into the hook registry:

```typescript
// After hookRegistry is created and user hooks registered
if (pluginState?.hooks) {
  hookRegistry.importFromPluginState(pluginState.hooks);
}
```

**`packages/core/src/run/index.ts`**: Accept `hookRegistry` in `RunOptions` and thread it through to task execution, replacing any ad-hoc `globalHookRegistry` usage.

### Emit Missing Hook Events

The following 17 events are typed but never fired. Each must be emitted at its natural lifecycle point:

| Event | Emit Location | When |
|---|---|---|
| `project:complete` | `run/index.ts` run completion | All tasks finished successfully |
| `project:fail` | `run/index.ts` run failure | Run terminated with error |
| `task:retry` | `run/index.ts` DAG worker loop | Before retry attempt begins |
| `task:skip` | `run/index.ts` DAG worker loop | Task skipped by `--select` or condition |
| `task:lifecycle-before` | `execute-task.ts` | After inputs snapshotted, before AI execution |
| `task:lifecycle-after` | `execute-task.ts` | After checks run, before rollup |
| `task:correction-attempt` | `execute-task.ts` | After each correction loop iteration |
| `checkpoint:restored` | `run/index.ts` | When resuming from saved state |
| `background:started` | background process manager | Process reached ready state |
| `background:degraded` | background process manager | Health check failing |
| `background:recovered` | background process manager | Health check recovered |
| `background:crashed` | background process manager | Process exited unexpectedly |
| `background:stopped` | background process manager | Graceful shutdown |
| `sidecar:started` | sidecar runner | Sidecar registered |
| `sidecar:stopped` | sidecar runner | Sidecar shut down |
| `schedule:started` | schedule runner | Timer started |
| `schedule:tick` | schedule runner | One execution completed |
| `schedule:stopped` | schedule runner | Timer stopped |
| `cohort:complete` | Already emitted in `next-task.ts` | Wire through per-run registry instead of global |

---

## Phase 1: Interceptor/Middleware Pattern

### Problem

`HookRegistry.fire()` iterates handlers and awaits each, but return values are discarded. Hooks are purely observational — they cannot modify task execution, check results, DAG structure, or error classification.

### Design

Add a Koa/Express-style middleware chain alongside the existing fire-and-forget hooks:

```typescript
// packages/core/src/hooks/interceptor-registry.ts

export type InterceptorFn<T> = (
  payload: T,
  next: () => Promise<T>,
) => Promise<T>;

export type InterceptEvent =
  | "intercept:task-execute"
  | "intercept:check-evaluate"
  | "intercept:dag-compile"
  | "intercept:skill-resolve"
  | "intercept:error-classify"
  | "intercept:retry-decide";

export class InterceptorRegistry {
  register<T>(event: InterceptEvent, fn: InterceptorFn<T>, priority?: number): void;

  /**
   * Run the middleware chain for `event`, wrapping `coreFn`.
   * Each interceptor calls next() to proceed; not calling next() blocks execution.
   * Errors in an interceptor skip it and proceed to the next.
   */
  intercept<T>(event: InterceptEvent, payload: T, coreFn: (p: T) => Promise<T>): Promise<T>;
}
```

**Semantics**:
- Interceptors execute in priority order (lower first, default 100)
- Each interceptor receives `payload` and a `next()` function
- Calling `next()` proceeds to the next interceptor (or the core function)
- Not calling `next()` cancels downstream execution (interceptor returns its own result)
- Interceptor errors are caught, logged, and skipped — the chain continues
- The final result flows back up through the chain (each interceptor can transform it)

### Wire into PluginAPIV2

```typescript
// packages/core/src/plugins/types.ts — add to PluginAPIV2
addInterceptor(event: InterceptEvent, fn: InterceptorFn<unknown>, priority?: number): void;
```

```typescript
// packages/core/src/plugins/types.ts — add to PluginStateV2
interceptors: Map<InterceptEvent, Array<{ fn: InterceptorFn<unknown>; priority: number }>>;
```

---

## Phase 2: Per-System Extension Points

### 2a. Check System — Custom Check Types

**Current state**: `runCheck()` in `packages/core/src/task/lifecycle/after.ts` handles `cmd` (shell), `ai` (LLM judge), and `test` types via inline dispatch. Adding a new check type requires modifying this function.

**Design**: Extract check dispatch into a `CheckTypeRegistry`:

```typescript
// packages/core/src/plugins/types.ts — add to PluginAPIV2

interface CheckEvalContext {
  taskId: string;
  projectDir: string;
  attemptDir: string;
  vars: Record<string, unknown>;
}

interface CheckRunResult {
  passed: boolean;
  output?: string;
  error?: string;
}

registerCheckType(
  type: string,
  evaluator: (check: CheckDef, ctx: CheckEvalContext) => Promise<CheckRunResult>,
): void;
```

**Built-in types** (`cmd`, `ai`, `test`) are registered at startup through the same registry — no special-casing.

**Plugin state**: Add `checkTypes: Map<string, CheckTypeEvaluator>` to `PluginStateV2`.

**Files changed**:
- `packages/core/src/task/lifecycle/after.ts` — extract check dispatch, use registry
- `packages/core/src/plugins/types.ts` — add types
- `packages/core/src/plugins/api.ts` — implement registration
- `packages/core/src/plugins/loader.ts` — wire state

**Use cases**:
- `type: "http"` — HTTP health check (GET endpoint, assert status 200)
- `type: "schema"` — JSON schema validation of output files
- `type: "query"` — SQL query against a database, assert row count or value
- `type: "lighthouse"` — Lighthouse performance score threshold

### 2b. Skill System — Custom Skill Sources

**Current state**: `buildSkillIndex()` in `packages/core/src/skills/discovery.ts` scans filesystem directories for `SKILL.md` files. No other resolution mechanism exists.

**Design**: Chain filesystem discovery with plugin-provided sources:

```typescript
// packages/core/src/plugins/types.ts — add to PluginAPIV2

interface SkillSource {
  name: string;
  resolve(query: { taskId: string; playbook: string; tags?: string[] }): Promise<SkillEntry[]>;
}

registerSkillSource(source: SkillSource): void;
```

**Resolution order**: Filesystem skills first (project-local), then plugin sources in registration order. First match wins.

**Plugin state**: Add `skillSources: SkillSource[]` to `PluginStateV2`.

**Files changed**:
- `packages/core/src/skills/discovery.ts` — accept external sources, chain with filesystem
- `packages/core/src/plugins/types.ts` — add types
- `packages/core/src/plugins/api.ts` — implement registration

**Use cases**:
- Skills from a database or HTTP API
- Dynamically generated skills based on task context
- Organization-shared skill libraries

### 2c. Journal/Telemetry — Event Consumers

**Current state**: `TaskEventWriter` in `packages/core/src/journal/event-writer.ts` writes events to a JSONL file via a write stream. Consumers must read the file directly.

**Design**: Add a consumer registration pattern:

```typescript
// packages/core/src/plugins/types.ts — add to PluginAPIV2

interface JournalConsumer {
  name: string;
  onEvent(event: TaskEvent): void | Promise<void>;
  onFlush?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}

registerJournalConsumer(consumer: JournalConsumer): void;
```

**Dispatch**: After writing to the file stream in `TaskEventWriter.write()`, dispatch to all registered consumers. Consumers run in parallel. Errors are caught and logged per-consumer — a failing consumer never blocks the journal.

**Plugin state**: Add `journalConsumers: JournalConsumer[]` to `PluginStateV2`.

**Files changed**:
- `packages/core/src/journal/event-writer.ts` — accept consumers, dispatch after write
- `packages/core/src/plugins/types.ts` — add types
- `packages/core/src/plugins/api.ts` — implement registration

**Use cases**:
- Datadog/CloudWatch/Prometheus metrics export
- Slack/Teams notifications on task completion or failure
- Custom dashboards and analytics aggregation
- Cost tracking (token usage per task)

### 2d. DAG Compilation — Transform & Validate

**Current state**: `compileUnified()` in `packages/core/src/run/compile-unified.ts` calls `buildDagFromUnifiedInventory()` and returns a `TaskDag`. No extension points in the pipeline.

**Design**: Use the interceptor pattern from Phase 1:

- `intercept:dag-compile` wraps the compilation call. Interceptors receive the playbook definition and can:
  - Transform task definitions before DAG construction
  - Inject synthetic dependency edges
  - Validate naming conventions or structural rules
  - Add custom node types
- After compilation, fire a `dag:compiled` event (fire-and-forget) for inspection

**Files changed**:
- `packages/core/src/run/compile-unified.ts` — wrap `buildDagFromUnifiedInventory()` with interceptor dispatch
- `packages/core/src/run/index.ts` — pass interceptor registry into compile step

**Use cases**:
- Custom node validators (enforce naming conventions, required fields)
- Auto-dependency injection (wire outputs to inputs across tasks)
- Format converters (import from dbt, Airflow, or other workflow DSLs)

### 2e. Error Classification & Retry

**Current state**: Error classification in `execute-task.ts` sets `errorKind` to `"transient"` or `"structural"` via hardcoded heuristics. Retry decisions are inline.

**Design**: Use interceptor pattern:

- `intercept:error-classify` — plugins get first shot at classifying an error. Returning a classification short-circuits the built-in classifier. Calling `next()` falls through to built-in heuristics.
- `intercept:retry-decide` — plugins can override retry logic (custom backoff, external circuit breakers, cost-based abort).

**Interceptor payload**:
```typescript
interface ErrorClassifyPayload {
  error: Error;
  taskId: string;
  attempt: number;
  maxAttempts: number;
  classification?: "transient" | "structural" | string;
}

interface RetryDecidePayload {
  error: Error;
  taskId: string;
  attempt: number;
  maxAttempts: number;
  classification: string;
  shouldRetry?: boolean;
  delayMs?: number;
}
```

**Files changed**:
- `packages/core/src/run/execute-task.ts` — dispatch through interceptor chain at error classification point
- `packages/core/src/run/index.ts` — dispatch through interceptor chain at retry decision point

### 2f. Task Execution Pipeline

**Current state**: `executeTask()` in `packages/core/src/run/execute-task.ts` is a 1849-line function handling the entire pipeline. No plugin extension points exist within the execution flow.

**Design**: Use the interceptor pattern:

- `intercept:task-execute` wraps the entire task execution. Interceptors receive `TaskExecutePayload` and can:
  - Modify `taskDef` before execution (inject checks, change timeout, override prompt)
  - Skip execution entirely (return a synthetic `TaskExecutionResult`)
  - Run post-processing on the result (transform, enrich, validate)
  - Implement custom executors (container, WASM, remote dispatch)

**Interceptor payload**:
```typescript
interface TaskExecutePayload {
  taskDef: TaskDefinition;
  taskId: string;
  projectDir: string;
  attemptNumber: number;
  result?: TaskExecutionResult;
}
```

**Files changed**:
- `packages/core/src/run/execute-task.ts` — extract core execution into a function, wrap with interceptor dispatch

### 2g. CLI Commands — Dynamic Registration

**Current state**: `packages/cli/src/main.ts` dispatches commands via a `switch(command)` statement. No dynamic registration mechanism.

**Design**:

```typescript
// packages/core/src/plugins/types.ts — add to PluginAPIV2

interface PluginCommand {
  name: string;
  description: string;
  aliases?: string[];
  handler(args: { positional: string[]; options: Record<string, unknown> }): Promise<void>;
}

registerCommand(cmd: PluginCommand): void;
```

**Plugin state**: Add `commands: Map<string, PluginCommand>` to `PluginStateV2`.

**Wire**: In the `switch(command)` `default` case, check plugin commands before showing "unknown command" error.

**Files changed**:
- `packages/cli/src/main.ts` — add plugin command fallback in default case
- `packages/core/src/plugins/types.ts` — add types
- `packages/core/src/plugins/api.ts` — implement registration

**Use cases**:
- `converge deploy` — deployment automation
- `converge benchmark` — performance benchmarking
- Provider-specific commands (e.g., `converge acp:status`)

---

## Phase 3: Provider Plugins

Providers (acp, claude, kimi, etc.) become plugins with three distribution tiers.

### Plugin Tiers

**Tier 1 — Built-in plugins**: Source in `packages/core/src/plugins/builtins/{name}/`. Compiled into `converge-core` dist. No separate npm package. Existing builtins (typescript, nextjs, git, docker, eslint, vitest) and provider plugins (acp, claudefn) work this way.

**Tier 2 — Platform plugins**: Published as `@openplaybooks/converge-provider-*` npm packages. Installed via `converge plugin install`. Maintained by the converge team.

**Tier 3 — Community plugins**: Any npm package with `convergePlugin: true` in `package.json`. Verified at install time.

### Plugin Package Format

```json
{
  "name": "@openplaybooks/converge-provider-acp",
  "version": "1.0.0",
  "type": "module",
  "convergePlugin": true,
  "main": "./dist/index.js",
  "converge": {
    "capabilities": ["providers"],
    "dependencies": []
  }
}
```

### Provider Registry

Replace hardcoded if/else dispatch in `packages/agentfn/src/agentfn.ts`:

```typescript
// packages/agentfn/src/provider.ts
const _providerRegistry = new Map<Provider, ProviderFactory>();

export function registerProvider(name: Provider, factory: ProviderFactory): void;
export function getProvider(name: Provider): ProviderFactory | undefined;
```

Built-in providers register at module load. Plugin providers register via `registerProviders(registry)` hook.

### Built-in Provider Plugin: acp

```typescript
// packages/core/src/plugins/builtins/acp/index.ts
const acpPlugin: ConvergePluginV2 = {
  name: "acp",
  version: "1.0.0",
  description: "ACP provider using @openplaybooks/acpfn",
  capabilities: ["providers"],
  setup(api) { /* no-op */ },
  registerProviders(registry) {
    registry.register("acp", async (opts) => {
      const { acpfn } = await import("@openplaybooks/acpfn");
      return acpfn(opts);
    });
  },
};
```

### CLI Commands

- `converge plugin install <name> [--yes]` — resolve, verify `convergePlugin: true`, install deps, add to `project.yaml`
- `converge plugin list` — list installed plugins with contributions
- `converge plugin uninstall <name>` — remove from `project.yaml` and `.converge/plugins/`

### `converge init` Integration

After provider selection, auto-install the corresponding plugin:

```typescript
const pluginName = PROVIDER_CATALOG.find(p => p.id === selectedBackend)?.pluginName;
if (pluginName) {
  await pluginInstallCommand({ name: pluginName, yes: true, dir: projectDir });
}
```

---

## Phase 4: Capabilities Declaration & Security

### Capabilities

Plugins declare what framework systems they hook into:

```typescript
export interface ConvergePluginV2 {
  // ... existing fields ...
  capabilities?: PluginCapability[];
}

export type PluginCapability =
  | "providers"
  | "hooks"
  | "check-types"
  | "skills"
  | "task-interceptors"
  | "dag-interceptors"
  | "error-classifiers"
  | "journal-consumers"
  | "commands";
```

**Runtime enforcement** (soft initially):
- `PluginAPIImplV2` checks declared capabilities on each registration call
- Undeclared capability usage emits a warning (future: hard error)
- `converge plugin list` displays capabilities per plugin

### Security Model

1. **`convergePlugin: true` verification** — loader rejects npm packages without this marker
2. **Built-in plugins are trusted** — source in monorepo, compiled into dist
3. **NPM allowlist** — `@openplaybooks/` namespace is trusted; community plugins use standard npm trust model
4. **Capability display** — CLI shows which framework systems a plugin hooks into, so users can assess risk
5. **Error isolation** — plugin failures in hooks, interceptors, and consumers never crash the framework

---

## Plugin Interface (Complete)

```typescript
export interface ConvergePluginV2 {
  name: string;
  version: string;
  description?: string;
  requires?: string[];
  capabilities?: PluginCapability[];

  setup(api: PluginAPIV2): void | Promise<void>;
  registerProviders?(registry: ProviderRegistry): void;
}
```

## PluginAPIV2 (Complete)

```typescript
export interface PluginAPIV2 {
  readonly options: Record<string, unknown>;
  readonly projectDir: string;

  // ── Function Registration ──
  registerCheck(check: CheckFnMeta): void;
  registerChecks(checks: CheckFnMeta[]): void;
  registerEval(evalFn: EvalFnMeta): void;
  registerEvals(evals: EvalFnMeta[]): void;
  registerPlan(plan: PlanFnMeta): void;
  registerPlans(plans: PlanFnMeta[]): void;
  registerTask(task: TaskFnMeta): void;
  registerTasks(tasks: TaskFnMeta[]): void;

  // ── Lifecycle Hooks (fire-and-forget) ──
  addHook(event: HookEvent, fn: HookFn): void;

  // ── Interceptors (middleware) ──          [NEW]
  addInterceptor(event: InterceptEvent, fn: InterceptorFn<unknown>, priority?: number): void;

  // ── Per-System Registries ──             [NEW]
  registerCheckType(type: string, evaluator: CheckTypeEvaluator): void;
  registerSkillSource(source: SkillSource): void;
  registerJournalConsumer(consumer: JournalConsumer): void;
  registerCommand(cmd: PluginCommand): void;

  // ── Tools & Vars ──
  addTool(name: string, factory: ToolFactory): void;
  addVars(vars: Record<string, unknown>): void;

  // ── Queries ──
  getVar(key: string): unknown;
  hasPlugin(name: string): boolean;
  getCheck(name: string): CheckFnMeta | undefined;
  getEval(name: string): EvalFnMeta | undefined;
  getPlan(name: string): PlanFnMeta | undefined;
  getTask(type: string): TaskFnMeta | undefined;

  // ── Deprecated ──
  /** @deprecated Use registerProviders hook on plugin */
  registerProvider(name: string, factory: ProviderFactory): void;
  /** @deprecated Use registerCheck */
  addCheck(name: string, plugin: unknown): void;
  /** @deprecated Use registerCheck */
  addChecks(checks: Record<string, unknown>): void;
  /** @deprecated Use registerTask */
  addTaskType(type: unknown): void;
  /** @deprecated Use registerTask */
  extendTaskType(name: string, extension: unknown): void;
}
```

## PluginStateV2 (Complete)

```typescript
export interface PluginStateV2 {
  // Existing
  checks: Map<string, CheckFnMeta>;
  evals: Map<string, EvalFnMeta>;
  plans: Map<string, PlanFnMeta>;
  tasks: Map<string, TaskFnMeta>;
  vars: Record<string, unknown>;
  hooks: Map<HookEvent, HookFn[]>;
  tools: Map<string, ToolFactory>;
  providers: Map<string, ProviderFactory>;
  loaded: string[];
  manifests: PluginManifestV2[];

  // New
  interceptors: Map<InterceptEvent, Array<{ fn: InterceptorFn<unknown>; priority: number }>>;
  checkTypes: Map<string, CheckTypeEvaluator>;
  skillSources: SkillSource[];
  journalConsumers: JournalConsumer[];
  commands: Map<string, PluginCommand>;
}
```

---

## Plugin Lifecycle

```
1. Parse plugin entries from project.yaml
2. Resolve each plugin (project-local -> built-in -> npm)
3. Validate (name, version, setup function)
4. Wrap V1 -> V2 if needed
5. Topological sort (respects requires)
6. For each plugin in order:
   a. Create PluginAPIImplV2 instance
   b. Call plugin.setup(api) — registers hooks, interceptors, check types, etc.
   c. Call plugin.registerProviders(registry) if defined
   d. Record manifest
   e. Add to state.loaded[]
7. Import plugin hooks into HookRegistry
8. Import plugin interceptors into InterceptorRegistry
9. Pass consumers/checkTypes/skillSources/commands to their respective systems
10. Return PluginStateV2
```

---

## Example: Full-Featured Plugin

```typescript
import type { ConvergePluginV2 } from "@openplaybooks/converge-core";

const monitoringPlugin: ConvergePluginV2 = {
  name: "monitoring",
  version: "1.0.0",
  description: "Datadog integration + HTTP health checks",
  capabilities: ["hooks", "check-types", "journal-consumers", "task-interceptors"],

  setup(api) {
    // Observe task lifecycle
    api.addHook("task:complete", async ({ ctx, result }) => {
      console.log(`Task ${ctx.taskId} completed in ${result.durationMs}ms`);
    });

    // Custom check type: HTTP health check
    api.registerCheckType("http", async (check, ctx) => {
      const res = await fetch(check.cmd!); // cmd holds the URL
      return { passed: res.ok, output: `${res.status} ${res.statusText}` };
    });

    // Journal consumer: export events to Datadog
    api.registerJournalConsumer({
      name: "datadog",
      async onEvent(event) {
        await datadogClient.sendEvent(event);
      },
    });

    // Interceptor: add timing metadata to every task result
    api.addInterceptor("intercept:task-execute", async (payload, next) => {
      const start = Date.now();
      const result = await next();
      result.metadata = { ...result.metadata, wallTimeMs: Date.now() - start };
      return result;
    });
  },
};

export default monitoringPlugin;
```

---

## Alternatives Considered

**Hooks-only extension (no interceptors)**: Simpler but prevents plugins from modifying behavior. Check types, error classification, and task execution all require the ability to transform data, not just observe it.

**Separate registries per system**: Would scatter the plugin API across many interfaces. Keeping everything on `PluginAPIV2` gives plugins a single, discoverable surface.

**Event bus (pub/sub)**: Good for observation but cannot modify data flowing through pipelines. The middleware chain pattern is better suited for interceptors that transform inputs/outputs.

**Worker-thread isolation**: Would protect the framework from buggy plugins but adds IPC overhead and prevents synchronous state sharing. Deferred to a future RFC for untrusted community plugins.

---

## Migration Path

| Phase | Scope | Depends On |
|---|---|---|
| 0: Fix hook wiring | Wire plugin hooks into HookRegistry, emit 17 missing events | Nothing |
| 1: Interceptor pattern | New InterceptorRegistry, `addInterceptor()` on PluginAPIV2 | Phase 0 |
| 2a: Check types | CheckTypeRegistry, `registerCheckType()` | Phase 1 |
| 2b: Skill sources | SkillSourceRegistry, `registerSkillSource()` | Phase 0 |
| 2c: Journal consumers | Consumer dispatch in EventWriter, `registerJournalConsumer()` | Phase 0 |
| 2d: DAG compilation | `intercept:dag-compile` wiring | Phase 1 |
| 2e: Error/retry | `intercept:error-classify`, `intercept:retry-decide` wiring | Phase 1 |
| 2f: Task execution | `intercept:task-execute` wiring | Phase 1 |
| 2g: CLI commands | `registerCommand()`, plugin command fallback | Phase 0 |
| 3: Provider plugins | Provider registry, built-in acp, CLI install/list/uninstall, init | Phase 0 |
| 4: Capabilities | `capabilities` field, runtime enforcement, security model | Phases 2-3 |

Backwards compatibility: Existing `project.yaml` with `plugins: [typescript, eslint]` continues to work. The V1-to-V2 wrapper handles legacy plugins. Provider selection by name string continues to work through the registry.

---

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Comprehensive rewrite |
| Phase 0: Fix hook wiring | **done** | CLI bridges plugin hooks via `importFromPluginState()` |
| Phase 0: Emit missing events | **done** | `project:complete`, `project:fail`, `task:skip`; `hookRegistry` threaded through RunOptions → RunTaskArgs |
| Phase 1: InterceptorRegistry | **done** | Middleware chain with priority, error isolation, blocking |
| Phase 1: `addInterceptor()` on API | **done** | On PluginAPIV2, stored in PluginStateV2.interceptors |
| Phase 1: Wire interceptors through CLI | **done** | CLI builds InterceptorRegistry from plugin state, passes to run() |
| Phase 2a: Check type registry | **done** | `registerCheckType()` on API, stored in state.checkTypes |
| Phase 2b: Skill source registry | **done** | `registerSkillSource()` on API, stored in state.skillSources |
| Phase 2c: Journal consumers | **done** | `registerJournalConsumer()` on API, stored in state.journalConsumers |
| Phase 2d: DAG interceptors | **done** | `compileUnifiedWithInterceptors()` wraps compilation with `intercept:dag-compile` |
| Phase 2e: Error/retry interceptors | **done** | `intercept:error-classify` and `intercept:retry-decide` events typed and tested |
| Phase 2f: Task execution interceptors | **done** | `intercept:task-execute` wired in execute-task.ts, transforms result |
| Phase 2g: CLI commands | **done** | `registerCommand()` on API; CLI dispatch fallback in default case |
| Phase 3: Provider registry in agentfn | **done** | Registry + acp registered |
| Phase 3: `registerProviders()` hook | **done** | Wired in loader |
| Phase 3: Built-in acp plugin file | **done** | `builtins/acp/index.ts` with lazy `@openplaybooks/acpfn` import |
| Phase 3: Plugin CLI commands | **done** | `converge plugin list/install/uninstall` |
| Phase 3: `converge init` integration | **defer** | |
| Phase 4: Capabilities declaration | **done** | `PluginCapability` type, `_checkCapability()` soft enforcement on API |
| Phase 4: Security hardening | **defer** | `convergePlugin: true` verification in loader |
| Tests (TDD) | **done** | 66 tests across 7 files |
| `pnpm build` | **done** | core + CLI build clean |
| Pre-existing failures | **skip** | |
