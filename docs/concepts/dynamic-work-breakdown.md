---
title: "Dynamic work-breakdown"
description: "Tasks spawn child tasks at runtime based on project state. Scope emerges from the problem instead of being predeclared."
sidebar:
  order: 4
---

## The pre-declared-graph problem

LangGraph, n8n, Temporal, every workflow framework that's structured as nodes and edges: they all assume you know the shape of the work before you start. You wire up the DAG, and execution follows the wires.

That's fine when the problem has a fixed shape. It breaks when the shape depends on the project. Three patterns that don't fit:

- **One task per discovered unit.** "Document each CLI command." How many commands? Depends on what's in `packages/cli/src/main.ts` today.
- **One task per source.** "Cross-validate every doc page against its declared `sources:`." How many pages? Depends on what the doc playbook has produced.
- **One task per item in a queue.** "Process every PR opened in the last week." Unknown until you call the GitHub API.

Without a runtime escape hatch, you either over-engineer the graph (declare 50 placeholder tasks, hope you have enough) or fall back to imperative loops outside the framework (and lose the framework's checkpointing, retries, and observability).

## One surface: declarative spawn manifests

Converge has a single primitive for spawning at runtime: a parent task writes a JSONL manifest, and the framework applies it. The parent declares its lifecycle with `mode:` (RFC 0022), and the framework auto-invokes `converge apply` (RFC 0021) for `mode: spawner` after the body returns.

Every task — static, spawned, template-rendered — gets a stable execution directory the runtime guarantees exists before the body runs:

```
.converge/journal/<playbook>/tasks/<task-id>/exec/
```

Exposed to the body as `$CONVERGE_TASK_DIR`. The manifest lives at `$CONVERGE_TASK_DIR/spawn.plan.jsonl`; the result file lands at `$CONVERGE_TASK_DIR/spawn.plan.result.jsonl`.

### `mode: spawner` — one-shot fan-out

A parent task with `mode: spawner` runs its body once, writes a manifest, and lets the framework ingest it.

```yaml
# .converge/playbooks/deep-research/tasks/000-bootstrap/TASK.md
---
id: 000-bootstrap
title: Deep research — bootstrap
mode: spawner
spawn:
  min_children: 1
  apply: auto         # default; framework runs converge apply after the body
checks:
  - id: spawn-plan-applied
    cmd: bash -c '! grep -q "\"ok\":false" "$CONVERGE_TASK_DIR/spawn.plan.result.jsonl"'
    description: "every row in spawn.plan.result.jsonl is ok:true"
---

# Bootstrap

Spawns the linear 6-task research pipeline.

```bash
QDIR=$(cat .converge/.question-dir)

cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<JSON
{"id":"initial-search","template":".converge/playbooks/deep-research/templates/001-initial/tasks/001-initial-search/TASK.md","vars":{"questionDir":"$QDIR"}}
{"id":"initial-gather","template":".converge/playbooks/deep-research/templates/001-initial/tasks/002-initial-gather/TASK.md","vars":{"questionDir":"$QDIR"},"after":["initial-search"]}
{"id":"scope-identification","template":".converge/playbooks/deep-research/templates/001-initial/tasks/003-scope-identification/TASK.md","vars":{"questionDir":"$QDIR"},"after":["initial-gather"]}
{"id":"final-report","template":".converge/playbooks/deep-research/templates/003-report/tasks/001-final-report/TASK.md","vars":{"questionDir":"$QDIR"},"after":["scope-identification"]}
JSON
```
```

The body just writes the manifest. No `converge apply` call required — the framework runs it post-body for `apply: auto` (the default).

### Manifest schema

One JSON object per line:

```ts
type SpawnRow = {
  id: string;                                          // ledger-unique
  template: string;                                    // path to a template TASK.md
  vars?: Record<string, string | number | boolean>;
  after?: string[];                                    // sibling depends_on
  no_inherit?: boolean;                                // skip CONVERGE_VAR_* inheritance
};
```

Unknown fields are rejected with an explicit `"unknown-field"` error — the AI gets a clear failure instead of a silent drop.

### `mode: converger` — multi-wave loops

When you don't know in advance whether you'll need a second wave of spawning, declare `mode: converger`. The body runs once per wave; the framework re-leases the task until a halt signal fires.

```yaml
# .converge/playbooks/scientific-research/TASK.md
---
id: scientific-research
title: Scientific research pipeline
mode: converger
converge:
  max_waves: 30
  halt_when:
    - id: epoch-done
      cmd: 'test -f "$CONVERGE_TASK_DIR/halt.marker"'
---

# Scientific Research Pipeline

Each loop iteration spawns one epoch task that runs the full 8-phase research cycle.

The body writes a manifest with the next epoch's spawn row, and optionally
writes `halt.marker` when convergence criteria are met.
```

Halt signals (priority order):

1. `$CONVERGE_TASK_DIR/halt.marker` exists → halt, success.
2. Every check in `halt_when:` passes → halt, success.
3. `wave_check` exits 0 → halt, success; exit 2 → halt, fail.
4. Wave count exceeds `max_waves` → halt, fail with `errorCode: "converger-max-waves"`.

### The fail-fix-pass loop

```
parent body runs
  └─ writes $CONVERGE_TASK_DIR/spawn.plan.jsonl
framework runs converge apply (auto)
  ├─ row ok → upsert into tasks.jsonl, render inventory TASK.md
  └─ row fail → append to spawn.plan.result.jsonl with errorCode
parent post-body validator
  ├─ all rows ok → parent converges (for mode: spawner)
  │              → wave halt evaluated (for mode: converger)
  └─ any fail   → check fails, triggers repair
repair prompt sees the manifest and the result file
  → edits the offending lines
  → re-runs converge apply
loop until clean
```

The loop is the same one the framework already runs for any failing check. The result file is the structured surface the AI patches against; you don't author a control plane, you shape the artefacts.

Per-row error codes: `duplicate-id`, `template-not-found`, `missing-vars`, `malformed-frontmatter`, `unsafe-id`, `unknown-field`, `internal`. See [RFC 0021](https://github.com/openplaybooks-dev/converge/blob/main/docs/rfcs/0021-declarative-spawn-apply.md) for the full spec.

### Picking a mode

- **Known-size, one-shot fan-out** (one child per item in a static list) → `mode: spawner`.
- **Unknown-size loop** (keep spawning until a condition is met) → `mode: converger`.
- **No spawning, just produce outputs** → `mode: leaf` (the default).
- **Synchronisation point, no body** → `mode: gateway`.

See [RFC 0022](https://github.com/openplaybooks-dev/converge/blob/main/docs/rfcs/0022-task-mode-contract.md) for the full mode contract.

## What this lets you express

Anything of the form *one X per Y, where Y is unknown until you look*. Examples shipped in this repo:

- One RFC draft per epoch, picked from a rotating set of sources (`.converge/playbooks/rfc-ideation/tasks/ideate/`).
- One research phase per question slug (`examples/deep-research`).
- One regression child per discovered bug (`examples/scientific-research`).

The parent can read anything to decide what to spawn: a file, a directory listing, an API call, the project's own config, an AI summary. The framework doesn't constrain *how* you discover units; it just gives you a structured place to commit them once you have.

## Composition with checks

Each spawned child has its own checks (declared in its template). The parent's check is its own contract — typically "every row in `spawn.plan.result.jsonl` is `ok:true`". Either way, the parent converges only when every child converges.

This is convergence at two levels: each child converges its own outputs against its own checks, and the parent converges by waiting for all children to converge. Hierarchy of contracts, each verifiable in isolation.

## Trade-offs

- **Determinism matters for re-runs.** A spawn body that produces different ids on each run (because it pulls from a live API, or because file order varies) will spawn ghost children. Sort outputs; snapshot dynamic inputs. `converge apply` is idempotent for byte-identical rows but rejects same-id-different-content as `duplicate-id` — exactly the signal you want.
- **Templates and vars create a soft typing problem.** A template that expects `{name, description}` and a manifest row that passes `{title, blurb}` won't error; the template will just have empty placeholders. The strict-mode `vars:` declaration in the template's frontmatter catches this — declare every required var with no default and the framework rejects manifest rows missing it (`errorCode: "missing-vars"`).
- **Debugging spawned children is one level deeper.** When a CLI-command page fails, you debug the child task. When the spawn itself is wrong (missed a command, generated a bad slug), you debug the manifest. Two different surfaces; the result file points at exactly which.

## Where this lives in the codebase

- `packages/core/src/task/spawn/apply.ts` — the `applyManifest()` function; ingests `spawn.plan.jsonl`, writes `spawn.plan.result.jsonl`, upserts `tasks.jsonl`.
- `packages/cli/src/commands-apply.ts` — the `converge apply` CLI verb.
- `packages/core/src/task/mode/` — the RFC 0022 mode contract: schema, validator, converger wave loop, inference.
- `packages/core/src/navigator/core/actions/execution/{run-spawner,run-converger,run-gateway}.ts` — the executor handlers that dispatch on `mode:`.
- `.converge/playbooks/rfc-ideation/tasks/ideate/TASK.md` — a real `mode: spawner` parent in this repo (emits one epoch per wave).
- `examples/deep-research/.converge/playbooks/deep-research/tasks/000-bootstrap/TASK.md` — another real `mode: spawner` parent.
- `examples/scientific-research/.converge/playbooks/TASK.md` — a real `mode: converger` parent.

For the engineering view of how spawn commits land atomically — children are staged and committed in a single batch after the parent body completes — see [Advanced: runtime hygiene](../advanced/05-runtime-hygiene). For the full proposals, see [RFC 0021](https://github.com/openplaybooks-dev/converge/blob/main/docs/rfcs/0021-declarative-spawn-apply.md) (manifest spec) and [RFC 0022](https://github.com/openplaybooks-dev/converge/blob/main/docs/rfcs/0022-task-mode-contract.md) (mode contract).
