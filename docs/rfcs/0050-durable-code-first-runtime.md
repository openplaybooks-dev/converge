---
rfc: 0050
title: Durable code-first runtime — a visible imperative flow, resumable mid-flight
status: accepted
type: feature
source: human
priority_tier: tier1
estimate: "8-12 days"
backwards_compatible: yes
risk: high
breaks_existing: no
---

# RFC 0050: Durable code-first runtime — a visible imperative flow, resumable mid-flight

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | This document |
| Design spike — pin the executor seam | **done** | Reuse `executeTask` per step; `RunStateManager`/`computeFingerprint`/`cacheOutputs` already do node-level replay; new code is the imperative front-end + `steps.jsonl` durable journal |
| Tests (TDD) — flow-runtime | **done** | `packages/core/tests/flow-runtime.test.ts` (6 tests): Task → outputs JSON, chaining, resume-in-the-middle trio, determinism, key stability under parallel — all green |
| Increment A — durable flow runtime | **done** | `run/flow/{step-journal,keys,runtime,load-flow,index}.ts`; deterministic replay + memoized `steps.jsonl`; inline + registry + TASK.md/template resolution; injected globals (`phase/log/args/Task/task/agent/parallel/pipeline/now/uuid`) |
| solve-waves.js compatibility | **done** | `load-flow.ts` runs the bare-global shape (`export const meta` + top-level `await agent()/Task()` + `return`); `agent()` is a journaled, resumable step via `agentBackend`. Test: a waves-shaped script runs and resumes (agent replayed) |
| `Task()` from TASK.md / template | **done** | `task("01-foo")` resolves `<tasksDir>/01-foo/TASK.md` (static) or `<templatesDir>/<name>/TASK.md` (template+params); outputs from frontmatter; real execution via `defaultRunStep` → `run()`. Test resolves the real hello-world TASK.md + replays |
| Increment B — CLI `converge run <flow>` + POC | **done** | `main.ts` flow short-circuit (`playbook.js`/`.mjs`) passing `tasksDir`/`templatesDir`. `examples/hello-world-flow`: `default` chains copied hello-world TASK.md tasks; `demo` is an LLM-free crash→resume demo. Verified end-to-end: crash mid-flight → `--resume` replays prefix → resume again runs zero steps |
| Increment C — lower the DAG onto the runtime | **defer** | One execution path; existing playbooks gain identical replay-resume; staged behind tests |
| **Production — architecture decision** | **done** | Shared executor + runstate projection (flow reuses the DAG's per-task executor, projects steps into `runstate.json` so tooling works); DAG engine stays for back-compat; full unification deferred |
| **Production Phase 2 — bounded fan-out** | **done** | `run/flow/semaphore.ts`: one global concurrency cap (`workers`, default 4 / `meta.run.workers`) shared across all nested `parallel`/`pipeline`; replays never count. Test: peak concurrent ≤ workers under 4×5 nested fan-out |
| **Production Phase 3 — crash-safety + determinism** | **done** | `step-journal.ts` append now `open('a')`+`writeSync`+`fsyncSync` (survives crash; concurrent appends interleave by whole lines); resume divergence guard warns when prior-run steps are no longer requested. Tests green |
| **Production Phase 1 — executor reuse + runstate projection** | **done** | `task("id")`/`task(tpl, params)` now execute through the **real DAG executor** (`executeSingleNode`, exported from `run/index.ts`) and **project into `runstate.json`** (`RunStateManager.upsertNode`), so `inspect`/`status`/Studio render flows. Key fix: `executeTask` derives the Unit context from the on-disk layout (only inventory / `journal/<pb>/spawned/<id>` / `epics` are accepted), so `executeStepViaNode` MATERIALIZES the resolved TASK.md — with `{{var}}` rendered + params injected as `vars` — under `.converge/journal/<flow>/spawned/<id>/TASK.md` and points the node there. Verified hermetically: a stub TASK.md runs via the executor, returns its outputs JSON, projects a `pass` node, and replays on resume. (`run/flow/node-executor.ts`) |
| **Production Phase 4 — human review mid-flow + run-lock** | **defer** | `Task(..,{handoff})` blocks polling `loadLatestHumanReview`; wire run-lock/`stop` into the flow CLI path |
| **Production Phase 5 — port app-builder + deep-research** | **defer** | Headline proof: both examples as `playbook.js`; `inspect` fan-out; crash→resume |
| **playbook.js as a folder format** | **done** | `task()` resolves relative paths against the flow's own dir (`flowDir` → `locateTaskMd`); `converge compile` and `loadPlaybookFromFolder` fall back to `playbook.js` (name from `meta`; DAG still from `tasks/`) when no `playbook.yml` — so a flow folder with no YAML compiles/loads. |
| **Coexist: `playbook.yml` default + optional `workflow.js`** | **done** | A folder keeps `playbook.yml` + `tasks/` as the declarative default; an optional **`workflow.js`** (primary name; `playbook.js`/`flow.js` aliases) provides a custom code-first flow. `run` uses `workflow.js` when present, else the YAML by default; `compile`/`inspect` always show the declarative `tasks/` DAG. Verified in `examples/hello-world-flow` (both files): `compile` → 2-node YAML DAG, `run` → the flow. |
| **~~Dogfood migration: tests/* → playbook.js~~ (reverted)** | **reverted** | The clean-break migration (delete `playbook.yml`) was undone in favour of the coexist model: the 14 static fixtures are restored to pristine YAML and the migration playbook removed. The self-hosting migration flow + `executeStepViaNode`/projection it exercised remain in history; the fixtures themselves are no longer touched. |
| **Unified `task()` — templates + multi-level fan-out** | **done** | `task()` is the single API for plain tasks AND templates: when a task declares a `vars:` block, params are filtered through the **strict contract** (reuses `task/spawn/render.ts:buildChildVars`: drop undeclared, fill defaults, throw on missing required); no `vars:` → verbatim. Call the same task N times with a distinct `key` to fan out — no separate `spawn()`, no `templates/` dir (tasks live under `tasks/`). Multi-level is recursion (no inventory ledger). **Result-driven pattern:** a child task emits a `{subs:[…]}` manifest as its output; the flow fans out grandchildren from that result (`const m = await task("child"); parallel(m.subs.map(s => () => task("sub", …, {key})))`). Example: `tests/test-seeding-flow/` reproduces test-seeding's 3-level tree offline (child-alpha emits N=wave subs, child-beta 2; `owner` filtered for the beta branch). 3 unit tests + the example, flow suite 15/15 green; `tests/test-seeding` (YAML) untouched. |
| `pnpm build` | **done** | core + cli ESM + DTS clean |
| Pre-existing failures | **skip** | Core suite baseline unchanged |

## Problem

Converge's execution is a **hidden declarative engine**: an author writes `playbook.yml` +
`tasks/<id>/TASK.md`, and the runner compiles an inventory + DAG and walks it internally. The flow —
what runs, in what order, with what fan-out and looping — is not a visible, editable artifact. An AI
or human who wants to *see* the orchestration, *edit* one step, and *resume* must reason about a
compiled DAG and hidden runstate.

We want the orchestration to be a **visible program** with the ergonomics of a Claude Code workflow
(`.claude/workflows/solve-waves.js`): a `meta` export plus a top-to-bottom imperative script using
injected primitives, ending in `return {...}`. Crucially, it must keep the two properties that make
a playbook more than a one-shot script:

1. **Resumable at any point mid-flight** — kill it halfway, re-run, and it continues from where it
   stopped rather than redoing completed work.
2. **Self-correcting** — a flow can be wrong; edit one step, re-run, and only that step (and anything
   downstream that consumes its now-changed output) re-executes.

## Proposed solution

### The core mechanism: deterministic replay + a memoized step journal

The flow runs top-to-bottom. Every side-effecting step (`Task()`, `agent()`) is a **journaled
checkpoint** keyed by a deterministic step id. On resume, the script **re-executes from the top**,
but each already-journaled step **returns its cached result instantly without re-running**, so
execution fast-forwards through the completed prefix and continues at the first un-journaled step.
The journal (`steps.jsonl`) is the durable state; replay reconstructs the live call stack. This is
the standard durable-execution pattern (Temporal / DBOS / Claude Code's own `Workflow
resumeFromRunId`, which caches the "longest unchanged prefix of `agent()` calls").

**Self-correction** is the same fingerprint: editing a step changes its `fingerprint`, the journal
entry no longer matches, the cached result is discarded, and the step re-executes. Earlier steps,
unchanged, replay; later steps see changed inputs (different `params`) so their fingerprints differ
too and they re-run.

### The determinism contract (the only real cost)

For replay to reconstruct the same call sequence, control flow between steps must be reproducible
from journaled values + `args`. Concretely:

- No raw `Date.now()` / `Math.random()` may drive branching or step keys. Use the injected,
  **journaled** `ctx.now()` / `ctx.uuid()` (their values are recorded on first run and replayed).
- Plain JS between steps must be pure or derive only from prior journaled outputs + `args`.

A lightweight determinism guard surfaces violations (a flow whose control flow diverges on replay).

### The interface (the visible program)

```js
// flow.mjs — the runtime injects the globals; this IS the execution
export const meta = { name: "demo", phases: [{ title: "Plan" }, { title: "Build" }, { title: "Verify" }] };

phase("Plan");
const plan = await Task("01-plan");                       // static TASK.md → returns its outputs JSON

phase("Build");
const shots = await parallel(
  plan.screens.map((s) => () => Task("render-screen", { screen: s.id }, { key: s.id }))
);                                                         // template + params, stable per-item key

phase("Verify");
const report = await Task("99-verify", { shots });        // consumes prior JSON as params
return { done: report.passed === report.total, report };
```

Injected globals: `meta` (read), `args`, `phase(title)`, `log(msg)`, `Task(idOrPath[, params][,
{key}])`, `parallel(thunks)`, `pipeline(items, ...stages)`, and deterministic `ctx.now()/ctx.uuid()`.

### `Task()` semantics — reuse Converge's two task references

`await Task(...)` returns the task's declared `outputs` as JSON; steps chain by passing that JSON
into the next `Task`'s `params`.

- `Task("01-foo")` / `Task("tasks/01-foo/TASK.md")` → **static** task (`taskRef:{kind:"static",dir}`),
  resolved via the existing `Unit.fromPath` / `parseTaskMd`.
- `Task("template-name", params)` → **template instantiation** (`taskRef:{kind:"template",name}` +
  `params`) via the existing template-rendering / spawn pipeline.

Both execute through the **existing** `executeTask` (skills/agents/`outputs`/`checks`/attempts/stub),
so there is no second executor. Resume/cache reuse `computeFingerprint` + `cacheOutputs` +
output-existence checks.

### Architecture — one runtime, two authoring surfaces

Rather than delete the DAG, unify on a single durable **step-runtime**. The imperative `flow.js` is
the primary, visible surface; the existing YAML/DAG **lowers onto the same journaled steps** (a DAG
is a constrained flow whose step order is its topological sort). Existing playbooks keep running and
gain the identical replay-resume semantics; there is one execution path, not two. This mirrors
Converge's existing "two sources, one in-memory shape the runtime can't tell apart" philosophy
(`packages/core/src/playbook.ts`).

## Design details

### Step journal record (`.converge/journal/<flow>/steps.jsonl`, append-only)

```jsonc
{ "key": "Build/render-screen#home", "fingerprint": "sha256:…", "taskId": "render-screen#home",
  "phase": "Build", "status": "done", "output": { /* outputs JSON */ }, "ts": "<journaled>" }
```

`has(key)` / `get(key)` / `append(record)`. The durable prefix is the set of `done` records whose
`fingerprint` still matches the live step and whose declared `outputs` still exist on disk.

### Deterministic step keys (`keys.ts`)

- Default: `"<phase>/<labelOrId>#<ordinal-within-(phase,label)>"`.
- Explicit `opts.key` for dynamic items (loops/fan-out) — recommended over bare positional ordinals
  so inserting a step earlier doesn't shift keys and force spurious downstream re-runs.
- Template steps key on `"<template>#<hash(params)>"`.

### Replay/execute decision (per step)

```
key = deriveKey(...);  fp = fingerprint(resolvedTaskDef)
rec = journal.get(key)
if (rec && rec.fingerprint === fp && outputsExist(rec)) return rec.output   // REPLAY
out = await execute(resolvedTaskDef)                                        // executeTask / executor
journal.append({ key, fingerprint: fp, output: out, ... }); return out
```

### Staging (Risk-1 mitigation)

`executeNode` in `run/index.ts` is a large inline closure; re-pointing the hot path is high-risk.
Land additively:

- **Increment A** — the flow runtime + `steps.jsonl` + keys + determinism, with `Task` backed by a
  direct executor for hermetic tests (no LLM/CLI). Proves the durable-replay loop end-to-end.
- **Increment B** — route real static/template tasks through the existing `executeTask`; CLI flow
  detection + `--resume`; `examples/hello-world-flow/` POC.
- **Increment C** — lower the DAG `run()` onto the same runtime (one execution path). Gated behind
  the existing example/playbook suites so no playbook regresses.

## Migration path

- Existing `playbook.yml` + `tasks/` playbooks are unaffected in A/B. In C they execute via the same
  step-runtime (lowered from the topo order) — behaviour-compatible, with the bonus of mid-flight
  resume becoming a property of the journaled-step layer.
- New authoring uses `flow.mjs` / `flow.js` (or `playbook.js`). TS source is supported only under
  `tsx` (dev); the shipped CLI supports `.mjs`/`.js`/`.cjs`. Bundled transpile is deferred.

## Verification criteria

- **Resume-in-the-middle trio**: (a) abort after step N → re-run replays 1..N from journal (an
  execution counter proves they didn't re-run) and continues at N+1; (b) no-op re-run → every step
  replays cached; (c) edit a step → that step + downstream re-run, earlier steps replay.
- **Determinism guard**: a flow branching on `ctx.now()` resumes identically; one branching on raw
  `Math.random()` is flagged.
- **Key stability**: a dynamic `parallel` fan-out with explicit `key` resumes each branch to the
  correct record even when list order changes.
- `pnpm build` + `pnpm test` clean; existing example/playbook suites green after Increment C.
