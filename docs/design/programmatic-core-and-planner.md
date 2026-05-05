---
title: "Programmatic Core & the Planner-as-Playbook"
description: "Move playbook execution out of the CLI and into a real programmatic interface in @converge/core. The planner becomes a code-defined playbook that runs through the same interface, callable from the CLI and from the studio without spawning a subprocess."
---

# Programmatic Core & the Planner-as-Playbook

> Design proposal for the next iteration of the `@converge/core` programmatic API.
>
> Status: **proposal**.
>
> **Scope: collapse the runtime into one in-process entry point.** Define a real `run(playbook, opts)` and `plan(opts)` on `@converge/core`. Move the 609-line orchestration loop from `packages/cli/src/dag-run.ts` and the 750+ lines of inline pre-flight in `packages/cli/src/main.ts` into core. Re-express the planner (`packages/core/src/planning/progressive-decomposition/`) as a code-defined playbook that runs through the same `run`. Replace the studio's CLI-subprocess detour (`apps/studio/src/lib/process-manager.ts`) with a direct in-process call. Replace the studio's mock planner (`apps/studio/src/lib/mock-reasoning.ts`) with a streaming Route Handler that wraps `core.plan(...)`.

## TL;DR

A Converge playbook is two things: an **in-memory shape** (a `Playbook` object made of `TaskDefinition`s) and a **folder layout** (`playbook.yml` + `tasks/<id>/TASK.md`). They should be interchangeable — the folder is one parsed source for the same in-memory shape. Today they almost are: `parsePlaybookYml`, `loadPlaybook`, `taskDef`, `defineProject`, `Unit` all exist and do the right thing. But the *running* half is broken or missing, and consumers go around it:

- `Runtime.run()` (`packages/core/src/runtime/runtime.ts:46-52`) throws `"Runtime.run() not yet fully implemented"`. The published doc example in [`@converge/core`](../reference/core-api.md) doesn't work.
- The CLI runs playbooks via a 609-line `dagAutonomousRun` (`packages/cli/src/dag-run.ts`) that composes `runDag` + `executeTask` + `RunStateManager` + `ExecutionLogger` itself — orchestration that *belongs in core*.
- The studio cannot drive any of this. `apps/studio/src/lib/process-manager.ts:25-30` shells out to `@converge/cli/dist/index.js` and parses stdout, because there is no in-process API.
- The planner (`packages/core/src/planning/progressive-decomposition/index.ts`) is its own bespoke loop with 15 `console.log` sites, no `AbortSignal`, hardcoded `agentfn` import, and a `Promise<void>` return. It can't stream events to a UI; it can't be cancelled; it can't be tested without real LLM calls. It's "a playbook that plans another playbook" but it doesn't go through the runtime — it reinvents one.
- The studio's "Plan new" tab is fully mocked (`apps/studio/src/lib/mock-reasoning.ts:234-471`) because the real planner has no UI-driveable surface.

This proposal collapses all of that into one entry point:

```ts
import { run, plan, definePlaybook, taskDef, loadPlaybookFromFolder } from '@converge/core';

// Run a code-defined playbook.
const pb = definePlaybook({ name: 'my-flow', tasks: [...] });
await run(pb, { projectDir, reporter, signal });

// Run a folder-defined playbook (parsed into the same shape).
const fromDisk = await loadPlaybookFromFolder('.converge/playbooks/my-flow');
await run(fromDisk, { projectDir, reporter, signal });

// Plan a new playbook. `plan` is itself just `run` of the planner-playbook.
await plan({ goal: 'build a baby tracker', outputDir, projectDir, reporter, signal });
```

The CLI's `case "run"` and `case "plan"` blocks each shrink to ~15 lines that call these. The studio's `/api/playbooks/run` and `/api/playbooks/plan` Route Handlers wrap these in a `ReadableStream` that emits NDJSON. **No subprocess. No mock. No CLI in the studio's path.**

## 1. The shape problem

The repo already has a unified in-memory representation: `Unit` (`packages/core/src/task/unit/unit.ts:104-145`) is constructed from a `TaskDefinition` regardless of whether that came from a `taskDef()` builder call or a parsed `TASK.md`. `parsePlaybookYml` (`packages/core/src/task/playbook/loader.ts:201`) does the path-to-code parse. The "single internal representation" is real.

What's missing is everything *after* the shape:

| Required for a programmatic interface | What core does today |
|---|---|
| Returns a structured run result | `Runtime.run()` throws (`runtime.ts:46-52`) |
| Streams progress events through an injected reporter | Inner functions write to stdout via 15+ `console.log` calls |
| Accepts an injected agent | `agentfn` is imported at the top of `analyze.ts:12` and the four implementer files; consumers cannot stub it |
| Cancellable | No `AbortSignal` anywhere in `dagAutonomousRun` or the planner |
| Pure interface (no side-effect coupling) | Hardcoded log dir, hardcoded recursion in the planner, hardcoded `console.log` everywhere |
| Pre-flight (slug suggestion, scaffold, kind detection) callable on its own | All inlined in `cli/src/main.ts:1265-1363` |
| Surfaced from `@converge/core`'s public entry point | `runPlanLayer` is reached via deep import from the CLI (`main.ts:1248-1250`); `dagAutonomousRun` lives in the CLI package, not core |

So consumers (the CLI, the studio) end up either:

1. **Composing core's parts themselves** — the CLI's `dag-run.ts` is 609 lines of "compose `buildDagFromPlaybook` + `runDag` + `executeTask` + `RunStateManager` + `ExecutionLogger` correctly," which means every consumer who wants to run a playbook has to re-do that, or
2. **Spawning the CLI as a subprocess** — what the studio does today (`apps/studio/src/lib/process-manager.ts:25-30`), which is the wrong tool for an in-process Node.js consumer and rules out structured event streaming, in-memory cancel, and shared agent state, or
3. **Reinventing a runtime** — what the planner does, complete with its own recursion, its own console output, and its own ad-hoc filesystem coupling.

All three are symptoms of the same gap: there is no public `run(playbook, opts)` in core.

## 2. The proposed surface

Two new public files in `@converge/core`. One thin verb on top.

### 2.1. `packages/core/src/playbook.ts` — the builders

```ts
export { taskDef } from './task/checks/builders.ts';

export interface PlaybookDefinition {
  name: string;
  description?: string;
  inputs?: Record<string, { default?: string; required?: boolean }>;
  tasks: TaskDefinition[];
  checks?: CheckDefinition[];
  run?: RunConfig;
}

export function definePlaybook(config: PlaybookDefinition): Playbook;

/** Parse playbook.yml + tasks/<id>/TASK.md into the same Playbook shape. */
export async function loadPlaybookFromFolder(dir: string): Promise<Playbook>;

/** Inverse: serialize a Playbook to disk. The planner-playbook calls this. */
export async function writePlaybookToFolder(pb: Playbook, dir: string): Promise<void>;
```

`loadPlaybookFromFolder` wraps the existing `parsePlaybookYml` + the `tasks/<id>/TASK.md` walker the loader already does. `writePlaybookToFolder` is new — it's the inverse, and it replaces the 309 lines of hand-rolled YAML/Markdown emit in `apps/studio/src/app/api/playbooks/create/route.ts:169-291`.

A folder-loaded playbook and a code-defined playbook are *the same object*. The runtime can't tell them apart. There is no folder-mode runtime vs. code-mode runtime — only one runtime that consumes the in-memory shape.

### 2.2. `packages/core/src/run.ts` — the executor

```ts
export type RunEvent =
  | { kind: 'run-start'; playbook: string; runId: string; projectDir: string }
  | { kind: 'compile-start' }
  | { kind: 'compile-complete'; nodeCount: number }
  | { kind: 'task-start'; taskId: string; attempt: number }
  | { kind: 'task-log'; taskId: string; level: 'info' | 'warn' | 'error'; message: string }
  | { kind: 'task-output'; taskId: string; path: string }
  | { kind: 'task-check-start'; taskId: string; checkId: string }
  | { kind: 'task-check-complete'; taskId: string; checkId: string; ok: boolean; message?: string }
  | { kind: 'task-complete'; taskId: string; durationMs: number }
  | { kind: 'task-failed'; taskId: string; error: string; durationMs: number }
  | { kind: 'children-spawned'; parentId: string; children: { id: string; title?: string }[] }
  | { kind: 'run-complete'; completed: number; failed: number; durationMs: number }
  | { kind: 'run-aborted'; reason: string };

export interface Reporter {
  emit(event: RunEvent): void;
}

export interface RunOptions {
  projectDir: string;
  inputs?: Record<string, string>;
  /** Selector expression — same DSL as `converge run --select`. */
  select?: string;
  resume?: boolean;
  fullRefresh?: boolean;
  /** Compile + emit events, don't execute. */
  dry?: boolean;
  /** Concurrency within a topological layer. Default 1. */
  concurrency?: number;
  /** Caller-supplied agent. Overrides the framework's default. */
  agentfn?: AgentFn;
  configDir?: string;
  /** Where the journal goes. `null` disables journaling (in-memory only). */
  journalDir?: string | null;
  reporter?: Reporter;
  signal?: AbortSignal;
}

export interface RunResult {
  runId: string;
  completed: number;
  failed: number;
  durationMs: number;
  nodes: Array<{ id: string; status: 'completed' | 'failed' | 'skipped'; outputs: string[] }>;
}

export async function run(playbook: Playbook, opts: RunOptions): Promise<RunResult>;

/** Convenience reporter that prints to stdout in the CLI's existing format. */
export function consoleReporter(): Reporter;

/** Convenience reporter that buffers events into an array. Used by tests. */
export function captureReporter(): Reporter & { events: RunEvent[] };
```

`run`'s body is what `dagAutonomousRun` does today (`packages/cli/src/dag-run.ts:175-433`):

1. Compile playbook → DAG via `buildDagFromPlaybook` (already in core).
2. Open journal via `ExecutionLogger` (already in core), unless `journalDir: null`.
3. Open `RunStateManager` (already in core).
4. Walk topological layers via `runDag` (already in core), executing each node via `executeTask` (already in core), spawning children via `executeDag`'s existing `spawnChildren` hook (`dag-runner.ts:73-124`).
5. Each `console.log` site becomes `reporter?.emit(...)` of a `RunEvent`.

The runtime infrastructure is *already in core* — `runDag`, `executeTask`, `RunStateManager`, `ExecutionLogger`, `TaskStateManager` all exist. The orchestration *around* them is what's been living in the CLI. This proposal moves only the orchestration; the parts stay where they are.

### 2.3. `packages/core/src/plan.ts` — the planner verb

```ts
import { run } from './run.ts';
import { definePlannerPlaybook } from './playbooks/planner/index.ts';
import type { RunOptions, RunResult } from './run.ts';

export interface PlanOptions extends RunOptions {
  goal: string;
  outputDir: string;
  /** Optional kebab-case slug; if omitted, derived from goal by the planner. */
  name?: string;
}

export async function plan(opts: PlanOptions): Promise<RunResult> {
  const playbook = definePlannerPlaybook({
    goal: opts.goal,
    name: opts.name,
    outputDir: opts.outputDir,
  });
  return run(playbook, opts);
}
```

That is the entire file. `plan` is a stable, documented entry point on core's public surface — but it has a one-line body. The CLI imports `plan`. The studio imports `plan`. They are equal-status consumers.

`definePlannerPlaybook` is also exported (for callers who want to inspect the playbook before running, or compose it with extra tasks), but it's secondary. Most consumers use `plan(opts)`.

## 3. The planner expressed as a playbook

This is the load-bearing idea: **the planner is one playbook**, not framework machinery. It happens to be a playbook whose output is *another playbook on disk*, but to the runtime it's exactly like any other playbook.

```ts
// packages/core/src/playbooks/planner/index.ts

import { definePlaybook, taskDef, writePlaybookToFolder } from '../../playbook.ts';

export function definePlannerPlaybook(opts: {
  goal: string;
  name?: string;
  outputDir: string;
}) {
  return definePlaybook({
    name: 'plan-new-playbook',
    description: `Plan a playbook for: ${opts.goal}`,
    inputs: { goal: { default: opts.goal, required: true } },
    tasks: [
      taskDef()
        .id('suggest-name')
        .title('Derive a kebab-case slug from the goal')
        .run(async (ctx) => {
          const slug = opts.name ?? await suggestPlaybookName(ctx.vars.goal, ctx.agent);
          await ctx.fs.write('out/slug.txt', slug);
        })
        .build(),
      taskDef()
        .id('analyze')
        .title('Write the root PLAN.md')
        .dependsOn('suggest-name')
        .prompt(buildAnalyzePrompt) // current `runAnalyze` body, called as an agent task
        .outputs(['out/PLAN.md'])
        .build(),
      taskDef()
        .id('implement')
        .title('Materialize first-layer children')
        .dependsOn('analyze')
        .run(async (ctx) => {
          const meta = parsePlanMdFrontmatter(await ctx.fs.read('out/PLAN.md'));
          // Spawn children at runtime — the runtime's existing dynamic-DAG
          // support (dag-runner.ts:73-124) handles the rest.
          for (const child of meta.children ?? []) {
            await ctx.spawn({ id: child.id, taskDef: childTaskDef(child) });
          }
        })
        .build(),
      taskDef()
        .id('serialize')
        .title('Write the produced playbook to disk')
        .dependsOn('implement')
        .run(async (ctx) => {
          await writePlaybookToFolder(ctx.state.producedPlaybook, opts.outputDir);
        })
        .build(),
    ],
  });
}
```

The mock phases the studio renders today (`enrich-requirements → design-document → plan-tests → plan-tasks → plan-seeds`) become **real tasks** in this playbook. The studio's `mapEvent` collapses to: incoming `task-start: analyze` → outgoing `phase-start: design-document`. The mock module dies.

Because `plan` is just `run` with a different playbook, **everything the runtime supports — cancel, journal, structured events, fingerprint-based incremental re-runs, parallel layers, retries — comes for free for planning**. There is no separate planning event protocol; `RunEvent` covers it.

`runPlanLayer`'s recursion across container children is no longer hand-rolled. It falls out of the runtime's existing `from_seed`-style fan-out: the `implement` task spawns container children, the runtime registers them via `executeDag` (`dag-runner.ts:73-124`), they run via the same loop. The 188-line `progressive-decomposition/index.ts` shrinks dramatically — only `parsePlanMdFrontmatter`, `readScopePacket`, and the prompt builders remain, as utilities the playbook's tasks call.

## 4. What collapses in the CLI

`packages/cli/src/main.ts` is 1750 lines. The bulk is inline pre-flight and orchestration that should live in core. After this proposal:

- **`case "run"`** (currently `main.ts:596-1500ish`, hundreds of lines of config resolution + playbook discovery + hook-registry construction + journal scope setting):

  ```ts
  case "run": {
    const pb = await loadPlaybookFromFolder(resolve(options.dir || ORIGINAL_CWD));
    const result = await run(pb, {
      projectDir: resolve(options.dir || ORIGINAL_CWD),
      select: options.select,
      resume: !!options.resume,
      fullRefresh: !!options.fullRefresh,
      reporter: consoleReporter(),
    });
    process.exit(result.failed > 0 ? 1 : 0);
  }
  ```

- **`case "plan"`** (currently `main.ts:1245-1399`):

  ```ts
  case "plan": {
    const result = await plan({
      goal: options.prompt ?? positional[0],
      outputDir: join(projectDir, '.converge/playbooks', options.name ?? '__derived__'),
      projectDir,
      reporter: consoleReporter(),
    });
    process.exit(result.failed > 0 ? 1 : 0);
  }
  ```

- **Deleted entirely:**
  - `packages/cli/src/dag-run.ts` (609 lines) — its body became `core/run.ts`.
  - `slugifyPrompt` and `suggestPlaybookName` (`main.ts:1683-1732`) — moved into the planner-playbook's `suggest-name` task.
  - The inline scaffold writer at `main.ts:1311-1323` — replaced by the planner-playbook's `serialize` task.

The CLI becomes a thin argv-parser + `consoleReporter()` adapter. Its job is to translate command-line flags into `RunOptions` / `PlanOptions` and print to stdout. Nothing more.

## 5. What collapses in the studio

`apps/studio/src/lib/process-manager.ts:25-30` spawns `@converge/cli/dist/index.js` as a subprocess and parses its stdout. That detour exists *only* because there is no in-process API.

After this proposal:

```ts
// apps/studio/src/app/api/playbooks/plan/route.ts
import { plan } from '@converge/core';
import { resolveProjectRoot } from '@/lib/core';
import { join } from 'node:path';

export async function POST(req: Request) {
  const { goal, name } = await req.json();
  const projectDir = resolveProjectRoot()!;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const reporter = { emit: (e) => controller.enqueue(enc.encode(JSON.stringify(e) + '\n')) };
      const ac = new AbortController();
      req.signal.addEventListener('abort', () => ac.abort());
      plan({
        goal,
        name,
        projectDir,
        outputDir: join(projectDir, '.converge/playbooks', name ?? '__pending__'),
        reporter,
        signal: ac.signal,
      })
        .catch((err) => reporter.emit({ kind: 'run-aborted', reason: String(err) }))
        .finally(() => controller.close());
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } });
}
```

`/api/playbooks/run/route.ts` is mechanically identical — it differs only in how the playbook object is constructed (`loadPlaybookFromFolder(...)` instead of `definePlannerPlaybook(...)` is implicit in `plan()`).

`apps/studio/src/components/PlanNewTab.tsx:155-165` swaps `runMockPlanning(...)` for a fetch reading NDJSON, with a small `mapPlannerEvent()` (~50 lines) that converts `RunEvent`s to the studio's existing `PlanningEvent` union (`mock-reasoning.ts:20-28`). The `PlanningConsole` UI keeps working unchanged.

Files that disappear:

- `apps/studio/src/lib/process-manager.ts` — the subprocess spawn.
- `apps/studio/src/lib/mock-reasoning.ts:234-471` — `runMockPlanning`, `reviseMockPlan`, `applyTaskFeedback` (types stay).
- `apps/studio/src/app/api/playbooks/create/route.ts` — 309 lines of YAML/Markdown emit; the planner-playbook's `serialize` task replaces it.

## 6. What stays the same

This proposal does **not** change:

- The `TASK.md` schema. `parsePlaybookYml` and `Unit` already produce the unified shape; nothing about the on-disk format changes.
- The journal. `ExecutionLogger`, `setExecutionScope`, `writeJournalManifest` all keep their behavior; they're just composed inside `core/run.ts` instead of inside `cli/dag-run.ts`.
- Seed semantics. `from_seed` still spawns children at runtime via the same `executeDag` hook (`dag-runner.ts:73-124`); the planner-playbook's `implement` task uses this hook through `ctx.spawn(...)`.
- The selector DSL (`--select`). It threads through as `RunOptions.select` and is applied during compile — same as today.
- The CLI verb names. `converge run` and `converge plan` keep their argv shape; only their bodies change.
- The `PlanningConsole` UI. The studio's phase/step rendering is preserved; only the event source changes.

## 7. Locked-in decisions

1. **No `Runtime` class.** `run(playbook, opts) → Promise<RunResult>` is the only execution entry. `RuntimeImpl` / `createRuntime` are removed from `packages/core/src/index.ts:209-213`. `packages/core/src/runtime/runtime.ts` shrinks to types-only or is deleted. The [`@converge/core` reference doc](../reference/core-api.md) is updated: the `runtime.executeProject(project)` example becomes `await run(playbook, { projectDir })`.

2. **Planner-playbook always writes to disk.** No `outputMode: 'memory' | 'folder'` toggle. The planner's last task is `serialize`, which calls `writePlaybookToFolder`. Studio "Reject" = `rm -rf <projectDir>/.converge/playbooks/<slug>`. Studio "Approve" is a no-op confirmation that switches tabs.

3. **`plan` is a first-class core verb that the studio calls directly — no CLI in the path.** The studio imports `plan` from `@converge/core` and calls it from a Route Handler in-process. The subprocess in `process-manager.ts` is deleted.

## 8. Implementation order

Each step is independently shippable; verification at each gate confirms the previous step is sound before continuing.

1. **`core/run.ts`** — move `dagAutonomousRun` (`packages/cli/src/dag-run.ts:175-433`) into core. Rename to `run`. Add `Reporter` / `RunEvent` / `AbortSignal` / `agentfn` plumbing. Replace 15+ `console.log` sites with `reporter.emit(...)`. Delete `Runtime` / `createRuntime` from `core/runtime/runtime.ts` and `core/index.ts:209-213`. Re-export `run`, `Reporter`, `RunEvent`, `RunResult`, `RunOptions`, `consoleReporter`, `captureReporter` from `core/index.ts`.
2. **`core/playbook.ts`** — re-export `taskDef`, add `definePlaybook`, `loadPlaybookFromFolder` (wraps existing `parsePlaybookYml`), `writePlaybookToFolder` (new). Re-export from `core/index.ts`.
3. **`core/playbooks/planner/`** — `definePlannerPlaybook({ goal, name?, outputDir })`. Each phase from `progressive-decomposition/` becomes one `taskDef()`. Move `slugifyPrompt` / `suggestPlaybookName` (`main.ts:1683-1732`) here.
4. **`core/plan.ts`** — public verb. Three lines plus types. Re-export `plan` and `PlanOptions` from `core/index.ts`.
5. **CLI migration** — `case "run"` calls `run(loadPlaybookFromFolder(...), ...)`. `case "plan"` calls `plan(...)`. Delete `packages/cli/src/dag-run.ts`. Delete `case "plan"` inline body (`main.ts:1245-1399`). Delete `slugifyPrompt` / `suggestPlaybookName` (`main.ts:1683-1732`).
6. **Studio migration** — add `/api/playbooks/run/route.ts` (calls `run`) and `/api/playbooks/plan/route.ts` (calls `plan`), both NDJSON streaming. Replace `runMockPlanning` in `PlanNewTab.tsx:155-165` with NDJSON fetch. Strip `runMockPlanning` / `reviseMockPlan` / `applyTaskFeedback` from `mock-reasoning.ts`. Delete `apps/studio/src/lib/process-manager.ts`. Delete `apps/studio/src/app/api/playbooks/create/route.ts`.

## 9. Verification

1. **Core unit test** (`packages/core/tests/run.test.ts`) — build a `Playbook` in code with three tasks (`a`, `b dependsOn a`, `c dependsOn b`), each with a JS `run` that writes a file. Call `run(pb, { projectDir: tmp, reporter: capture })`. Assert: files in order, event sequence is `run-start → compile-start → compile-complete(3) → task-start(a) → task-complete(a) → ... → run-complete(3,0)`, `RunResult.completed === 3`. No real LLM call.
2. **Folder-parity test** — write the same playbook as `playbook.yml` + `tasks/<id>/TASK.md`, call `await run(await loadPlaybookFromFolder(dir), opts)`, assert the same event sequence and the same on-disk artifacts. This is the "path parses to code" guarantee.
3. **Cancel test** — pass an `AbortController` whose `abort()` fires after the first `task-start`. Assert `run()` rejects with `AbortError`, `run-aborted` event was emitted, no further `task-start` events.
4. **Planner-playbook test** — stub `agentfn` to return a fixed `PLAN.md`. Call `plan({ goal: 'baby tracker', outputDir: tmp, projectDir: tmp, reporter: capture, agentfn: stub })`. Assert (a) `tmp/playbook.yml` and `tmp/tasks/<id>/TASK.md` exist, (b) the captured event stream contains the same task-lifecycle events as any other playbook — i.e., the planner is genuinely just a playbook.
5. **Round-trip test** — `await run(await loadPlaybookFromFolder(tmp))` (run the playbook the planner just produced) succeeds. Closes the loop: code-defined planner → folder on disk → loaded back into code → executable.
6. **CLI parity** — `pnpm --filter @converge/cli build && node packages/cli/dist/index.js run` against an existing example produces the same on-disk + journal output as the `git stash` baseline.
7. **Studio E2E** — `pnpm --filter @converge/studio dev`, open Plan-new tab. Confirm `ps aux | grep converge` shows **no subprocess** while a plan is running — only the Next.js process. Network tab shows NDJSON on `/api/playbooks/plan` (`content-type: application/x-ndjson`, one event per line).
8. **No deep imports from outside core** — `rg "from ['\"]@converge/core/(?!playbook|run|plan|client|studio-api|planner)" apps/ packages/cli` returns zero hits. The CLI's current deep imports in `dag-run.ts:25-36` are gone.
9. **No console output from core's run path** — `rg "console\." packages/core/src/run.ts packages/core/src/playbooks/planner` returns zero hits.
10. **Type checks clean** across `core`, `cli`, `studio`.

## 10. Out of scope

- **Other CLI verbs.** `build`, `compile`, `test`, `list`, `seed` keep their current bodies. They have similar layering issues but the scope of this proposal is `run` + `plan`. Migrating them follows the same pattern in a separate change.
- **Per-task feedback / Revise UX.** The studio's mock `applyTaskFeedback` and `reviseMockPlan` need a `run({ resume: true, scopeToTaskId })` mode that doesn't exist yet. Out of scope; remove from the UI for now or keep behind a "preview" label.
- **Multi-playbook composition.** Running playbook A which itself triggers playbook B is interesting but unrelated. Today's `from_seed` covers the runtime-spawn case, which is enough for the planner.
- **Browser-side execution.** `run` is Node-only (filesystem, journal, agent calls). The studio's UI is a streaming consumer, not a runtime host.

## 11. Migration table

| Today | After |
|---|---|
| `packages/cli/src/dag-run.ts` (609 lines) | Deleted; body in `packages/core/src/run.ts` |
| `packages/cli/src/main.ts:596-1500ish` (`case "run"` body) | ~15 lines calling `run(loadPlaybookFromFolder(...), ...)` |
| `packages/cli/src/main.ts:1245-1399` (`case "plan"` body) | ~15 lines calling `plan(...)` |
| `packages/cli/src/main.ts:1683-1732` (`slugifyPrompt`, `suggestPlaybookName`) | Moved into `core/playbooks/planner/` |
| `packages/core/src/runtime/runtime.ts` (`Runtime`, `createRuntime`, stubs) | Deleted; `run()` is the only entry |
| `packages/core/src/planning/progressive-decomposition/index.ts` (188 lines, `runPlanLayer`) | Replaced by `definePlannerPlaybook`; only utilities remain |
| `apps/studio/src/lib/process-manager.ts` (CLI subprocess spawn) | Deleted |
| `apps/studio/src/lib/mock-reasoning.ts:234-471` (`runMockPlanning` etc.) | Deleted; types kept |
| `apps/studio/src/app/api/playbooks/create/route.ts` (309 lines) | Deleted; replaced by planner-playbook's `serialize` task |
| `apps/studio/src/components/PlanNewTab.tsx:155-165` (`runMockPlanning`) | NDJSON fetch from `/api/playbooks/plan` |
| `docs/reference/core-api.md` `runtime.executeProject(...)` example | `await run(playbook, { projectDir })` |
