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

## One surface: template invocation (RFC 0024)

Converge has a single primitive for spawning at runtime: the parent task writes one `<id>/spawn.yml` invocation per child under `$CONVERGE_SPAWN_DIR`. The framework discovers each invocation, expands it against the template under `templates/<name>/`, validates the params, and applies. The parent declares its lifecycle with `mode:` (RFC 0022); the spawn pipeline (RFC 0024) takes over from there.

Every task gets a stable execution directory the runtime guarantees exists before the body runs:

```
.converge/journal/<playbook>/tasks/<task-id>/exec/
.converge/journal/<playbook>/tasks/<task-id>/exec/spawn/     # CONVERGE_SPAWN_DIR
```

The spawn directory is exposed to the body as `$CONVERGE_SPAWN_DIR`. Per-child evidence lands there: `<id>/spawn.yml` (body-authored invocation), `<id>/EXPANDED.md` (framework-rendered template), `<id>/EVIDENCE.json` (machine-readable failure detail), and `STATUS.md` (the AI-facing transparency surface).

The legacy `spawn.plan.jsonl` manifest still exists as the framework's internal IR — the new pipeline regenerates it from the discovered `spawn.yml` files. Bodies that write the manifest directly are flagged `SPAWN_MANIFEST_AUTHORED_BY_BODY` and the apply is blocked.

### `mode: spawner` — invoke templates, don't author tasks

A parent task with `mode: spawner` runs its body once. The body writes one `<id>/spawn.yml` per child; the framework expands them post-body.

```yaml
# .converge/playbooks/deep-research/tasks/000-bootstrap/TASK.md
---
id: 000-bootstrap
title: Deep research — bootstrap
mode: spawner
spawn:
  min_children: 1
  apply: auto         # default; framework runs preview→apply after the body
checks:
  - id: spawn-clean
    cmd: '! grep -q "^- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md"'
    description: every row in STATUS.md is [x]
---

# Bootstrap

Spawns the linear 6-task research pipeline.

```bash
QDIR=$(cat .converge/.question-dir)

for SPEC in \
  "initial-search:001-initial-search:"  \
  "initial-gather:002-initial-gather:initial-search"  \
  "scope-identification:003-scope-identification:initial-gather"  \
  "final-report:001-final-report:scope-identification"; do
  ID="${SPEC%%:*}"; REST="${SPEC#*:}"; TEMPLATE="${REST%%:*}"; AFTER="${REST#*:}"
  mkdir -p "$CONVERGE_SPAWN_DIR/$ID"
  cat > "$CONVERGE_SPAWN_DIR/$ID/spawn.yml" <<EOF
template: $TEMPLATE
${AFTER:+depends_on: [$AFTER]}
params:
  questionDir: $QDIR
EOF
done
```
```

The body writes invocation files. The framework runs preview-then-apply: every invocation is resolved against `templates/<name>/`, params are validated against `PARAMS.yml`, the template is expanded, and the resulting rows are committed. If any invocation fails preview (template-not-found, missing-required-param, …) nothing mutates the ledger — the AI reads `STATUS.md`, applies the `fix:` blocks, and re-runs.

### Invocation schema (RFC 0024)

Exactly three fields per file:

```yaml
template: <template-name>     # required — name only, no path
depends_on:                   # optional — sibling spawn ids
  - <other-id>
params:                       # required if the template declares params
  <key>: <value>
note: <free-text>             # optional — surfaces a gap when no template fits
```

The directory name *is* the child id; there is no `id:` field. There is no `outputs:`, no `checks:`, no body — the template owns those. Unknown fields are rejected with an explicit `unknown-field` error.

Templates live under `templates/<name>/` with `TASK.md` (the contract with `{{paramName}}` interpolation), optional `PARAMS.yml` (declared params), and optional `EXAMPLES.yml` (canonical invocations + selection guidance the AI reads to pick by closest example).

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
  └─ writes $CONVERGE_SPAWN_DIR/<id>/spawn.yml files
framework runs preview (RFC 0024)
  ├─ invocation ok → expand template, write EXPANDED.md, queue row
  └─ invocation fail → write EVIDENCE.json, queue [ ] row in STATUS.md
framework writes STATUS.md (single AI-facing surface)
  ├─ no failures → apply rows via internal IR (RFC 0021 applyManifest)
  └─ any failure → no journal mutation; repair loop fires
repair prompt reads STATUS.md
  → opens the [ ] row's spawn.yml
  → applies the fix: block (file + patch)
  → body re-runs; byte-identical invocations are no-ops
loop until STATUS.md is all [x]
```

The loop is the same one the framework already runs for any failing check. `STATUS.md` is the structured surface the AI patches against; you don't author a control plane, you shape three-field invocation files.

Per-child error codes: `template-not-found`, `missing-required-param`, `unknown-param`, `param-type-mismatch`, `invalid-yaml`, `unknown-field`, `duplicate-id`, plus the anti-goal locks `SPAWN_TASKMD_AUTHORED_BY_BODY` and `SPAWN_MANIFEST_AUTHORED_BY_BODY`. See [RFC 0024](../rfcs/0024-ai-native-spawning.md) for the full spec.

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

Each spawned child has its own checks (declared in its template). The parent's check is its own contract — typically "every row in `$CONVERGE_SPAWN_DIR/STATUS.md` is `- [x]`". Either way, the parent converges only when every child converges.

This is convergence at two levels: each child converges its own outputs against its own checks, and the parent converges by waiting for all children to converge. Hierarchy of contracts, each verifiable in isolation.

## Trade-offs

- **Determinism matters for re-runs.** A spawn body that produces different ids on each run (because it pulls from a live API, or because file order varies) will spawn ghost children. Sort outputs; snapshot dynamic inputs. Byte-identical `spawn.yml` re-runs are no-ops; same-id-different-content surfaces as `duplicate-id` (delete the child dir to force re-spawn) — exactly the signal you want.
- **Templates and params have a typed contract.** `PARAMS.yml` declares each param's type, required flag, and default. The framework rejects invocations missing a required param (`missing-required-param`), passing an extra one (`unknown-param`, with a "did you mean" hint), or sending the wrong type (`param-type-mismatch`). If no `PARAMS.yml` exists the framework infers required params from `{{...}}` references in the template's TASK.md.
- **Debugging spawned children is one level deeper.** When a CLI-command page fails, you debug the child task. When the spawn itself is wrong (missed a command, generated a bad slug, picked the wrong template), the AI's repair surface is `STATUS.md` — one `- [ ]` row per failed invocation with the file to edit and the patch to apply.

## Where this lives in the codebase

- `packages/core/src/task/spawn/templates.ts` — RFC 0024 template registry (`loadTemplates`, `findTemplate`).
- `packages/core/src/task/spawn/discover.ts` — RFC 0024 invocation discovery (scans `<id>/spawn.yml` under the spawn dir).
- `packages/core/src/task/spawn/expand.ts` — RFC 0024 expansion (param validation, mustache interpolation, did-you-mean hints).
- `packages/core/src/task/spawn/status.ts` — RFC 0024 STATUS.md writer (the AI-facing transparency surface).
- `packages/core/src/task/spawn/strays.ts` — RFC 0024 anti-goal locks (`SPAWN_TASKMD_AUTHORED_BY_BODY`, `SPAWN_MANIFEST_AUTHORED_BY_BODY`).
- `packages/core/src/task/spawn/ingest.ts` — RFC 0024 preview→apply orchestrator (`ingestSpawnDir`).
- `packages/core/src/task/spawn/apply.ts` — RFC 0021 `applyManifest()`; kept as the framework's internal IR, fed by `ingestSpawnDir`.
- `packages/core/src/task/mode/` — the RFC 0022 mode contract: schema, validator, converger wave loop, inference.
- `packages/core/src/navigator/core/actions/execution/{run-spawner,run-converger,run-gateway}.ts` — the executor handlers that dispatch on `mode:`; `run-spawner` calls `ingestSpawnDir` when the body produced `<id>/spawn.yml` files and falls back to `applyManifest` for unmigrated bodies.
- `.converge/playbooks/rfc-ideation/tasks/ideate/TASK.md` — a real `mode: spawner` parent in this repo (emits one epoch per wave).
- `examples/deep-research/.converge/playbooks/deep-research/tasks/000-bootstrap/TASK.md` — another real `mode: spawner` parent.
- `examples/scientific-research/.converge/playbooks/TASK.md` — a real `mode: converger` parent.

For the engineering view of how spawn commits land atomically — children are staged and committed in a single batch after the parent body completes — see [Advanced: runtime hygiene](../advanced/05-runtime-hygiene). For the full proposals, see [RFC 0024](../rfcs/0024-ai-native-spawning.md) (the invocation surface), [RFC 0021](https://github.com/openplaybooks-dev/converge/blob/main/docs/rfcs/0021-declarative-spawn-apply.md) (internal manifest spec) and [RFC 0022](https://github.com/openplaybooks-dev/converge/blob/main/docs/rfcs/0022-task-mode-contract.md) (mode contract).
