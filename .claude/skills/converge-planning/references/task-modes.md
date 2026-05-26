# Task Modes Reference (RFC 0022)

Load this when authoring a parent task and deciding its `mode:`, OR when reading a runtime contract violation (`$CONVERGE_TASK_DIR/mode-violation.json`) and you need to know what each error code means.

Every TASK.md declares one of four modes. The runtime dispatches on the field, runs the per-mode lifecycle, and validates the body's output against a typed contract. Violations are addressable: each one has an `errorCode` the repair loop can fix.

```yaml
# minimum:
mode: leaf    # or: spawner | converger | gateway
```

Modes are a deliberate cap of four. If the shape you're authoring doesn't fit, the decomposition is wrong — go back to the goal tree.

---

## `mode: leaf`

**Intent.** Produce declared `outputs:`. No children. The common case.

```yaml
id: 03-render-card
mode: leaf
outputs:
  - lib/widgets/card.dart
checks:
  - id: card-exists
    cmd: test -f lib/widgets/card.dart
```

**Body responsibility.** Write the files listed in `outputs:`. That's it.

**Post-body invariants the framework enforces:**

| `errorCode` | When it fires |
|---|---|
| `leaf-spawned` | The body called `converge spawn` or wrote `$CONVERGE_TASK_DIR/spawn.plan.jsonl`. Leaf tasks must not spawn — either change `mode:` to `spawner`, or remove the spawn calls. |
| `leaf-has-children` | A row in the runtime ledger lists this task as `parent`. Same fix as above. |

Leaf is the default behaviour you want unless you're sure you need fan-out or a loop.

---

## `mode: spawner`

**Intent.** One-shot fan-out by *invoking templates*. The body calls `converge spawn --template <name> --id <id> --param key=value` per child, registering each in `tasks.jsonl`. The framework expands each invocation against the template's contract and applies. The parent converges when every child converges.

```yaml
id: 02-fan-out-shots
mode: spawner
spawn:
  min_children: 1                # default: 0
  max_children: 50               # default: 1000
  apply: auto                    # default: "auto" — framework runs preview→apply after the body
checks:
  - id: spawn-clean
    cmd: '! grep -q "^- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md"'
```

**Body responsibility.**

- For each child, call `converge spawn`:
  ```bash
  converge spawn --template shot --id shot-002 --param shot=002 --after shot-001
  ```
- The framework validates params against the template's `PARAMS.yml` (or inferred from `{{...}}` references), expands the template's TASK.md, and applies. Errors are addressable per-child: each failure lands as a `- [ ]` row in `$CONVERGE_SPAWN_DIR/STATUS.md` with a `fix:` block.
- Do **not** write `$CONVERGE_TASK_DIR/spawn.plan.jsonl` yourself — that's the framework's internal IR. Bodies that do are flagged `SPAWN_MANIFEST_AUTHORED_BY_BODY` and the apply is blocked.
- Do **not** write a child's `TASK.md` directly — contracts live in templates. Bodies that hand-author `<id>/TASK.md` are flagged `SPAWN_TASKMD_AUTHORED_BY_BODY`.

**Repair loop.** After the body runs, the framework writes `STATUS.md` at the spawn root with one row per child. Anything still `- [ ]` carries a `fix:` block. Repeat until every row is `- [x]`. To force re-spawn of one child, drop it and re-issue the `converge spawn` call.

**Post-body invariants the framework enforces:**

| `errorCode` | When it fires |
|---|---|
| `spawner-missing-manifest` | The body produced no spawn invocations (no `converge spawn` calls issued) and no legacy `spawn.plan.jsonl`. Call `converge spawn` at least once. |
| `spawner-empty-manifest` | Legacy manifest exists with zero rows but `min_children > 0`. Either add rows, or set `min_children: 0` to declare an intentionally-empty fan-out. |
| `spawner-row-count` | Row count is outside `[min_children, max_children]`. Adjust the invocations or widen the bounds. |
| `spawner-apply-failed` | At least one invocation failed (template-not-found, missing-required-param, unknown-param, param-type-mismatch, duplicate-id, …). Read `$CONVERGE_SPAWN_DIR/STATUS.md` — every failed row carries a `fix:` block. |
| `SPAWN_TASKMD_AUTHORED_BY_BODY` | The body wrote `<id>/TASK.md` instead of using `converge spawn`. Contracts live in templates; bodies invoke them via CLI. |
| `SPAWN_MANIFEST_AUTHORED_BY_BODY` | The body wrote a top-level `spawn.plan.jsonl`. The manifest is framework-internal — use `converge spawn` CLI calls. |

Spawner is one-shot. After children complete and the parent's `checks:` pass, the parent converges. The body never re-runs unless a child re-runs and the parent's check goes red.

---

## `mode: converger`

**Intent.** Multi-wave loop. Same body re-runs each wave; the framework checks for a halt signal between waves. The structural fix for "loops forever" — every converger has a `max_waves` backstop.

```yaml
id: 04-fix-all-type-errors
mode: converger
converge:
  max_waves: 20                  # default: 10
  halt_when:                     # all checks pass ⇒ halt
    - id: zero-type-errors
      cmd: pnpm tsc --noEmit
  wave_check:                    # alternative: exit-code protocol
    cmd: scripts/wave-decision.sh
```

A converger needs at least one halt mechanism — `halt_when:` (one or more checks; all must pass) OR `wave_check:` (one cmd; exit code drives the decision). The schema rejects a converger with neither.

**Body responsibility per wave.**

- Read state, do something useful, write evidence.
- Optionally call `converge spawn` if this wave needs to spawn children. Framework expands and applies them (same as spawner).
- Optionally write `$CONVERGE_TASK_DIR/halt.marker` if the body knows it's done (e.g., the tool reported zero errors). This is the body's explicit "I'm done" signal; framework honours it before evaluating `halt_when` / `wave_check`.

**Halt-signal priority** (first one wins, evaluated post-body each wave):

1. `$CONVERGE_TASK_DIR/halt.marker` exists → halt, success.
2. Every check in `halt_when:` passes → halt, success.
3. `wave_check` exits `0` → halt, success. Exit `2` → halt, give up. Exit `1` (or other) → continue.
4. Structural backstop: wave count exceeds `max_waves` → halt, fail with `converger-max-waves`.

**Post-body invariants the framework enforces:**

| `errorCode` | When it fires |
|---|---|
| `converger-max-waves` | The wave counter exceeded `converge.max_waves`. Either raise the bound, tighten `halt_when:` to terminate sooner, or change the body strategy. |
| `converger-no-halt-signal` | Schema-level defence: a converger reached the wave loop with neither `halt_when` nor `wave_check`. Add one. |
| `spawner-apply-failed` | A per-wave spawn step failed for at least one child. Read `$CONVERGE_SPAWN_DIR/STATUS.md` or `spawn.plan.result.jsonl` (legacy). |

The wave counter persists at `$CONVERGE_TASK_DIR/wave.counter` and survives crashes, re-leases, and worker restarts. The body reads the current wave number from the `$CONVERGE_TASK_WAVE` environment variable (auto-set by the framework; do not parse the file directly).

**Additional halt mechanisms:** Besides `halt.marker` and `halt_when`/`wave_check`, the body can call `converge tasks mark <id> --status done --reasoning "..."` to short-circuit the wave loop. This is the pattern used in `test-waves` and `test-goal-driven`.

**Passthrough limitation (framework gap):** `passthrough: true` with RFC 0022 `converge: { max_waves, wave_check }` currently does not complete the full wave loop (the navigator exits when task checks pass). Workaround: design the task's `checks:` to fail until the body's own convergence script passes, so the gap-repair loop drives re-execution. The convergence decision stays deterministic (a shell script) — only the loop mechanism differs.

---

## `mode: gateway`

**Intent.** Synchronisation point with no body and no own outputs. Exists so downstream tasks can depend on one edge instead of N.

```yaml
id: 09-staging-ready
mode: gateway
depends_on: [01-build, 02-test, 03-lint]
```

**Body responsibility.** None. The TASK.md body must be empty or whitespace.

**Post-body invariants the framework enforces:**

| `errorCode` | When it fires |
|---|---|
| `gateway-spawned` | A spawn manifest was written. Gateways must not spawn — either delete the manifest write, or change `mode:` to `spawner`. |
| `gateway-has-body` | The TASK.md body has non-whitespace content. Move the work to a `mode: leaf` task and have the gateway depend on it. |

A gateway with `outputs:` is rejected at parse — gateways have no own outputs by definition.

---

## Per-task execution directory (`$CONVERGE_TASK_DIR`)

The framework sets `$CONVERGE_TASK_DIR` to `.converge/journal/<playbook>/tasks/<task-id>/exec/` before the body runs. Bodies write there; the framework reads from there. The directory persists across attempts so a crashed body's partial manifest survives.

Files the planner / operator should know about:

| File | Written by | When to look at it |
|---|---|---|
| `spawn/STATUS.md` | Framework (preview→apply) | The single AI-facing transparency surface. One `- [x]`/`- [ ]` row per child. Failed rows carry a `fix:` block. |
| `spawn/<id>/EXPANDED.md` | Framework (preview step) | The rendered template TASK.md with `{{...}}` substituted. Read this to verify expansion matches intent. |
| `spawn/<id>/EVIDENCE.json` | Framework (preview/apply) | Machine-readable per-child failure detail. Mirrors a row in STATUS.md. Useful from `converge inspect`; not on the AI's repair path. |
| `spawn.plan.jsonl` | (Legacy) spawner/converger body | The pre-RFC-0024 manifest. New playbooks should use `converge spawn` CLI calls instead. |
| `spawn.plan.result.jsonl` | (Legacy) framework `converge apply` | Per-row outcome for the legacy manifest path. |
| `wave.counter` | Framework (`run-converger`) | The current wave number for a `mode: converger` task. |
| `halt.marker` | Converger body | Exists iff the body declared "I'm done this wave." Highest-priority halt signal. |
| `mode-violation.json` | Framework validator | One per failed invariant. Contains `errorCode`, `declaredMode`, `message`, `fixHint`. Read this first when a parent reports `FRONTIER_UNRESOLVED`. |

This same map appears in `converge-control/SKILL.md` (operator view) and `converge-development/reference/observability.md` (developer view). Keep them in sync.

---

## Picking a mode — decision heuristic

Most parents are easy:

- **Hand-write under `tasks/<id>/TASK.md`, each with `mode: leaf`** when you have ≤7 children, known at plan time. No mode declaration needed on the children's parent (it picks up children from disk).
- **`mode: spawner`** when the child set is data-driven, larger than 7, or list-shaped (one per row in a JSON catalog, one per entry in a directory listing). Body iterates the catalog and calls `converge spawn` per row.
- **`mode: converger`** when the loop's stopping point is a *check*, not a count — refine until a quality threshold, fix until tsc passes, iterate until no contradictions. Multi-wave by definition.
- **`mode: gateway`** when you want one sync point downstream tasks can depend on, instead of repeating a long `depends_on:` list.

**The catalog pattern.** Prefer "expected" over "adaptive" when designing a spawner: have an upstream task produce a structured catalog file (`tokens-catalog.json`, `shots.json`, etc.), then the downstream `mode: spawner` body reads it and emits one manifest row per entry. The result is a DAG whose dynamic children are still *predictable* — you can read the catalog before running and know what will spawn.

```
upstream catalog task          →  downstream mode: spawner
writes tokens-catalog.json     →  reads it, emits one row per token
(concrete output)              →  (manifest is deterministic from the catalog)
```

One extra task makes the rest of the dynamic DAG queryable. Adaptive spawners (no catalog, the parent decides at runtime) are valid but harder to reason about — use them only when no catalog can exist.

---

## See also

- **RFC 0022** (Task mode contract) — defines the four modes, their lifecycle, and the `converge:` config schema.
- **RFC 0031** (`converge spawn` CLI) — the current spawn primitive; bodies call `converge spawn --template <name> --id <id> --param key=value`.
- **RFC 0021** (Declarative spawn apply) — the internal JSONL manifest schema (`converge apply`); framework-internal, bodies should not write it directly.
- [`patterns.md`](./patterns.md) — common goal-tree shapes; which mode each shape typically wants.
- [`schema.md`](./schema.md) — full frontmatter field reference.
