---
title: "Workflows (code-first flows)"
description: "A workflow.js is a visible, resumable imperative program that orchestrates Converge tasks — fully compatible with Claude Code's workflow API."
sidebar:
  order: 7
---

# Workflows

A **workflow** is the orchestration of a playbook written as a visible imperative program (`workflow.js`) instead of declarative DAG wiring. The flow runs top-to-bottom, you read it like code, and it is **resumable at any point mid-flight** through a durable step journal.

It is defined by two compatibility contracts that meet in one file:

- **Fully compatible with Claude Code's workflow API** — a Converge workflow is the *same API* as a Claude Code workflow (`.claude/workflows/*.js`): `export const meta` + a body that calls `agent` / `task` (`Task`) / `parallel` / `pipeline` / `phase` / `log` / `args`, with the same `meta.phases` progress model and the same `await`-driven control flow. Copy a `solve-waves.js`-style workflow into a playbook folder and it runs unchanged.
- **Fully compatible with Converge** — a workflow is *optional*. It coexists with `playbook.yml` + `tasks/`; `task("01-foo")` runs a real on-disk `TASK.md` (`outputs:`, `checks:`, attempts, self-correction) through the same engine the DAG uses; every step is projected into `runstate.json` so `inspect` / `status` / Studio render it like any other run.

### The API is Claude Code's workflow API

Every primitive maps one-to-one to the Claude Code [Workflow](https://docs.claude.com/en/docs/claude-code) tool, so the same script is portable in both directions:

| Claude Code workflow | Converge workflow | Same? |
|---|---|---|
| `export const meta = { name, description, phases }` | identical | ✅ |
| `agent(prompt, { schema, label, phase, agentType })` | identical | ✅ |
| `parallel(thunks)` / `pipeline(items, ...stages)` | identical | ✅ |
| `phase(title)` / `log(msg)` / `args` | identical | ✅ |
| — (Claude Code has no on-disk task) | `task(ref, params?, opts?)` / `Task(...)` runs a `TASK.md` | ➕ Converge superset |

The only addition is `task()`: Converge lets a step *be a real `TASK.md`* with `outputs:`/`checks:`, not just an `agent()` call. Everything a Claude Code workflow can do, a Converge workflow can do identically; Converge adds durable on-disk tasks on top.

> **When to reach for it.** Declarative `playbook.yml` is the default and stays best for fixed pipelines. Reach for a `workflow.js` when orchestration is the hard part: data-dependent fan-out, loops until a condition, result-driven branching, multi-level spawn trees — control flow that reads more honestly as code than as a graph spec.

## The shape

```js
// .converge/playbooks/default/workflow.js
export const meta = {
  name: "default",
  description: "Chain this playbook's TASK.md tasks as a visible flow.",
  phases: [{ title: "Greet" }, { title: "Render" }],
};

export default async function flow({ phase, log, task }) {
  phase("Greet");
  const greeting = await task("01-create-greeting"); // runs tasks/01-.../TASK.md
  log("greeting.json produced");

  phase("Render");
  const hello = await task("02-render-hello", { greeting }); // chain outputs forward

  return { done: true, greeting, hello };
}
```

Two body styles are accepted, both matching Claude Code workflows:

- **Default export** (above): `export default async function flow(ctx) { … }` — `ctx` carries the primitives.
- **Bare-global** (`solve-waves.js` style): `export const meta` followed by a top-level body that uses ambient `phase`/`task`/`agent`/… and a top-level `return`. The runtime injects the same primitives as globals.

## Primitives

The flow context (and the bare-global ambient scope) exposes:

| Primitive | What it does |
|---|---|
| `task(ref, params?, opts?)` | Run a task; returns its `outputs` JSON. Replays if journaled. `ref` is a task id (`"01-foo"`), a path (`"tasks/x/TASK.md"`, resolved against the workflow's own dir), or an inline spec. Pass a distinct `opts.key` to fan the same task out N times. |
| `Task(...)` | Capitalized alias of `task` (Claude-workflow naming). |
| `agent(prompt, opts?)` | An ephemeral, journaled agent step. Returns structured output (honors `opts.schema`). Sugar for one-off AI work that isn't a `TASK.md`. |
| `parallel(thunks)` | Run thunks concurrently under the global concurrency cap; barrier — awaits all. |
| `pipeline(items, ...stages)` | Run each item through all stages independently, no barrier between stages. |
| `phase(title)` | Start a progress group (matches `meta.phases`). |
| `log(msg)` | Emit a narrator line. |
| `args` | The value passed to the run, verbatim. |
| `now()` / `uuid()` | **Journaled** clock and id — deterministic across replays. Use these instead of `Date.now()` / `Math.random()` so resume is reproducible. |
| `state` / `useState` | **Durable, resume-safe key-value state** across steps (RFC 0051) — see below. |

## `task()` is unified — plain tasks and templates, one API

There is no separate `spawn()` primitive and no `templates/` directory. `task()` covers both:

- **Plain task** — `task("01-create-greeting")`. No `vars:` block on the `TASK.md`, so `params` flow in verbatim.
- **Template / parameterized task** — when the `TASK.md` declares a `vars:` block, `params` are filtered through the **strict vars contract** (the same rule as `converge spawn`): only declared keys flow in, defaults fill, missing required vars throw. Call it again with a distinct `key` to fan out:

```js
const sprints = await task("plan-sprints");        // → { subs: [{ index: 0 }, { index: 1 }, …] }
for (const s of sprints.subs) {
  await task("run-sprint", { sprint_id: "sprint-042", index: s.index }, { key: `run-sprint-${s.index}` });
}
```

**Multi-level fan-out is plain recursion** — no inventory ledger. The idiomatic pattern is *result-driven*: a child task emits a `{ subs: [...] }` manifest as its output, and the flow fans out grandchildren from that result. See `tests/test-seeding-flow/` for the 3-level seeding tree as a code-first flow.

## Coexistence — the workflow is optional

A folder keeps `playbook.yml` + `tasks/` as the declarative default. Dropping a `workflow.js` beside them overrides *orchestration only* — the same tasks run.

| Command | yml only | workflow.js only | both present |
|---|---|---|---|
| `converge run` | DAG engine (default) | the workflow | **the workflow wins** |
| `converge compile` / `inspect` | DAG | the workflow's `meta` (fallback) | the declarative `tasks/` DAG |

So `run` honors the override; `compile`/`inspect` always show the declarative `tasks/` graph. Remove or rename the workflow and the same tasks run by default — **no YAML is ever required to be deleted.** (Primary filename: `workflow.js`. Aliases for back-compat: `workflow.mjs`, `playbook.js`/`.mjs`, `flow.js`/`.mjs`.)

## Durable replay — resumable mid-flight

The flow re-executes top-to-bottom on every run. Each step is keyed by a deterministic fingerprint (id + params + contract version). Before executing, the runtime consults `.converge/journal/<flow>/steps.jsonl`:

- **Hit** → return the cached result instantly — no execution, no AI call.
- **Miss** → execute the step, then append its result (`fsync`'d, crash-safe).

A resumed run therefore **fast-forwards through the completed prefix** and continues exactly where it stopped. This is deterministic replay over a memoized step journal — the same model as Temporal / DBOS / Claude Code's `resumeFromRunId`.

```bash
converge run default              # fresh
converge run default --resume     # completed steps replay; the rest continue
converge run default --dry        # print what each step would run, execute nothing
```

**Determinism contract:** keep raw `Date.now()` / `Math.random()` out of control flow — use journaled `now()` / `uuid()`. Editing a step changes its fingerprint, so only that step and everything downstream re-run. On resume the runtime warns when prior-run steps are no longer requested (control-flow drift).

## Bounded fan-out

One global concurrency cap (`meta.run.workers`, default 4) is shared across **all** nested `parallel` / `pipeline`. An `assets × screens`-style fan-out never spawns more than N executions at once, no matter how deeply the parallelism nests.

## Durable state — `state` / `useState`

A flow often needs to carry **state across steps**: accumulated metadata, per-task durations, running notes, counters, a manifest it builds up as it fans out. `ctx.state` is a durable key-value store for exactly that — and unlike a plain `let`, it survives a crash + `--resume` and is readable on disk.

```js
export default async function flow({ task, state, useState, now }) {
  const start = now();
  const r = await task("01-render");

  state.set("01-render.duration_ms", now() - start);     // metadata
  state.update("notes", (ns) => [...ns, "rendered ok"], []); // running notes
  const [count, setCount] = useState("renders", 0);          // React-style sugar
  setCount(count + 1);                                        // a durable counter

  return state.all(); // { "01-render.duration_ms": …, notes: […], renders: 1 }
}
```

| Call | Effect |
|---|---|
| `state.set(key, value)` | Write any JSON value. |
| `state.get(key, fallback?)` | Read, with an optional default. |
| `state.update(key, fn, fallback?)` | Read-modify-write (`fn(prev)`). |
| `state.all()` | A snapshot object of every key. |
| `useState(key, initial?)` | `[value, setter]` sugar for a single key. |

**Where it lives — the inventory, not the journal.** State is stored under `.converge/inventory/<flow>/`, because the journal is ephemeral execution evidence (gitignored) while the inventory is Converge's committed, authoritative runtime state (RFC 0033). Durable flow state belongs with the source of truth, so it survives across runs and is version-controllable. Two files, mirroring the event-log + projection split:

- `state.jsonl` — append-only event log of writes (the durable record).
- `state.json` — last-write-wins snapshot (the read surface for `inspect` / Studio / a human), rewritten on every `set`.

**Resume correctness.** Each write is event-sourced into `state.jsonl` (keyed by a per-key write counter, like `now()`/`uuid()`). On `--resume` the flow re-runs and **re-applies writes in order**, so a `state.get` taken in the replayed prefix returns the value it had *at that point* — not the final value. That means state is safe to branch on, not just to record. Repeated resumes don't grow the log (writes are idempotent by key). A fresh (non-resume) run resets it; `--dry` keeps state in memory only.

> Use it for metadata, durations, notes, counters, manifests. Two `parallel` branches writing the *same* key race (last-write-wins) — give each branch a distinct key.

## What you get for free

Because `task()` runs through Converge's real per-task executor, a workflow inherits the whole framework:

- `outputs:` validation and deterministic `checks:` ([Deterministic checks](./deterministic-checks.md)).
- Per-task attempts and [task self-correction](./task-self-correction.md).
- `runstate.json` projection → `inspect` / `status` / Studio render the flow like any other run.
- File-based [context interpolation](./context-interpolation.md): a task's `outputs` JSON is the return value you chain forward.

## See also

- Example: [`examples/hello-world-flow`](../../examples/hello-world-flow/) — coexist demo (`default`) + an LLM-free resume demo (`demo`).
- [RFC 0050 — Durable code-first runtime](../rfcs/0050-durable-code-first-runtime.md) — design and rationale.
- [The playbook](./playbook.md) — the declarative default a workflow overrides.
