# Task Modes Reference (RFC 0045)

Load this when authoring a parent task and deciding how it should behave after its body runs, OR when reading a runtime contract violation (`$CONVERGE_TASK_DIR/mode-violation.json`) and you need to know what each error code means.

**RFC 0045: `mode:` is no longer declared in frontmatter.** Task behavior is derived by the framework after the body runs, by inspecting what artifacts exist:

| What exists after body | Internal mode | Framework behavior |
|---|---|---|
| `spawn.plan.jsonl` | **spawner** | Apply children (auto-apply by default) |
| `spawn:` block in frontmatter + body wrote `<id>/spawn.yml` | **spawner** | Same — apply children |
| `converge:` block in frontmatter | **converger** | Run wave loop |
| Body empty (no skill, no bash fences) | **gateway** | Done immediately |
| None of the above | **leaf** | Check outputs, done |

`spawn:` and `converge:` are optional config blocks — they stay in frontmatter and are validated at parse time. `mode:` itself is gone.

---

## `leaf` (default)

**Trigger.** No `spawn.plan.jsonl`, no `spawn:` config, no `converge:` config, body has content or a skill.

**Intent.** Produce declared `outputs:`. No children.

```yaml
id: 03-render-card
outputs:
  - lib/widgets/card.dart
checks:
  - id: card-exists
    cmd: test -f lib/widgets/card.dart
```

**Body responsibility.** Write the files listed in `outputs:`. Use a skill or run a shell script.

**Post-body invariants the framework enforces:**

| `errorCode` | When it fires |
|---|---|
| `leaf-spawned` | The body wrote `$CONVERGE_TASK_DIR/spawn.plan.jsonl` or any `$CONVERGE_SPAWN_DIR/<id>/spawn.yml`. A leaf task must not spawn — either add `spawn:` config, or delete the spawn writes. |
| `leaf-has-children` | A row in the runtime ledger lists this task as `parent`. Same fix as above. |

---

## `spawner`

**Trigger.** `spawn.plan.jsonl` exists OR `spawn:` block present in frontmatter AND body wrote `<id>/spawn.yml` files under `$CONVERGE_SPAWN_DIR`.

**Intent.** One-shot fan-out by *invoking templates*. The body writes one `<id>/spawn.yml` per child — three fields, naming a template, its dependencies, and its parameters. The framework expands each invocation against the template's contract and applies. The parent converges when every child converges.

```yaml
id: 02-fan-out-shots
spawn:
  min_children: 1
  max_children: 50
  apply: auto                    # framework runs preview→apply after the body
checks:
  - id: spawn-clean
    cmd: '! grep -q "^- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md"'
```

**Body responsibility.**

- For each child, write one invocation file under `$CONVERGE_SPAWN_DIR/<id>/spawn.yml`. The directory name *is* the child id; the file has exactly three fields:
  ```yaml
  template: shot                 # template name (no path), discoverable via `ls templates/`
  depends_on:                    # optional sibling spawn ids
    - shot-001
  params:                        # required if the template declares params
    shot: "002"
  ```
- The framework discovers every `spawn.yml`, validates `params:` against the template's `PARAMS.yml` (or inferred from `{{...}}` references), expands the template's TASK.md, and applies. Errors are addressable per-child: each failure lands as a `- [ ]` row in `$CONVERGE_SPAWN_DIR/STATUS.md` with a `fix:` block telling you which file to edit and what to put there.
- Do **not** write `$CONVERGE_TASK_DIR/spawn.plan.jsonl` yourself — that's the framework's internal IR. Bodies that do are flagged `SPAWN_MANIFEST_AUTHORED_BY_BODY` and the apply is blocked.
- Do **not** write a child's `TASK.md` directly — contracts live in templates. Bodies that hand-author `<id>/TASK.md` are flagged `SPAWN_TASKMD_AUTHORED_BY_BODY`.

**Repair loop.** After the body runs, the framework writes `STATUS.md` at the spawn root with one row per child. Anything still `- [ ]` carries the file to edit and the patch to apply. Repeat until every row is `- [x]`. To force re-spawn of one child, `rm -rf <id>/` and re-write its `spawn.yml`.

**Post-body invariants the framework enforces:**

| `errorCode` | When it fires |
|---|---|
| `spawner-missing-manifest` | The body produced no spawn invocations under `$CONVERGE_SPAWN_DIR` (no `<id>/spawn.yml` files) and no legacy `spawn.plan.jsonl`. Write at least one invocation file. |
| `spawner-empty-manifest` | Legacy manifest exists with zero rows but `min_children > 0`. Either add rows, or set `min_children: 0` to declare an intentionally-empty fan-out. |
| `spawner-row-count` | Row count is outside `[min_children, max_children]`. Adjust the invocations or widen the bounds. |
| `spawner-apply-failed` | At least one invocation failed (template-not-found, missing-required-param, unknown-param, param-type-mismatch, duplicate-id, …). Read `$CONVERGE_SPAWN_DIR/STATUS.md` — every failed row carries a `fix:` block. |
| `SPAWN_TASKMD_AUTHORED_BY_BODY` | The body wrote `<id>/TASK.md` instead of `<id>/spawn.yml`. Contracts live in templates; bodies invoke them. |
| `SPAWN_MANIFEST_AUTHORED_BY_BODY` | The body wrote a top-level `spawn.plan.jsonl`. The manifest is framework-internal — use `<id>/spawn.yml` invocations. |

Spawner is one-shot. After children complete and the parent's `checks:` pass, the parent converges. The body never re-runs unless a child re-runs and the parent's check goes red.

---

## `converger`

**Trigger.** `converge:` block in frontmatter.

**Intent.** Multi-wave loop. Same body re-runs each wave; the framework checks for a halt signal between waves. Every converger has a `max_waves` backstop so it can't loop forever.

```yaml
id: 04-fix-all-type-errors
converge:
  max_waves: 20
  halt_when:                     # all checks pass ⇒ halt
    - id: zero-type-errors
      cmd: pnpm tsc --noEmit
  wave_check:                    # alternative: exit-code protocol
    cmd: scripts/wave-decision.sh
```

A converger needs at least one halt mechanism — `halt_when:` (one or more checks; all must pass) OR `wave_check:` (one cmd; exit code drives the decision). The schema rejects a converger with neither.

**Body responsibility per wave.**

- Read state, do something useful, write evidence.
- Optionally write `<id>/spawn.yml` invocations under `$CONVERGE_SPAWN_DIR` if this wave needs to spawn children. Framework expands and applies them (same as spawner).
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
| `spawner-apply-failed` | A per-wave spawn step failed for at least one child. Read `$CONVERGE_SPAWN_DIR/STATUS.md` (RFC 0024 invocations) or `spawn.plan.result.jsonl` (legacy). |

The wave counter persists at `$CONVERGE_TASK_DIR/wave.counter` and survives crashes, re-leases, and worker restarts.

---

## `gateway`

**Trigger.** Body is empty — no skill declared, no ```bash fences in the parsed TASK.md.

**Intent.** Synchronisation point with no body and no own outputs. Exists so downstream tasks can depend on one edge instead of N.

```yaml
id: 09-staging-ready
depends_on: [01-build, 02-test, 03-lint]
```

**Body responsibility.** None. The TASK.md body must be empty or whitespace.

**Post-body invariants the framework enforces:**

| `errorCode` | When it fires |
|---|---|
| `gateway-spawned` | A spawn manifest was written. Gateways must not spawn — delete the manifest write. |
| `gateway-has-body` | The TASK.md body has non-whitespace content. Move the work to a leaf task and have the gateway depend on it. |

A gateway with `outputs:` is rejected at parse — gateways have no own outputs by definition.

---

## Per-task execution directory (`$CONVERGE_TASK_DIR`)

The framework sets `$CONVERGE_TASK_DIR` to `.converge/journal/<playbook>/tasks/<task-id>/exec/` before the body runs. Bodies write there; the framework reads from there. The directory persists across attempts so a crashed body's partial manifest survives.

Files the planner / operator should know about:

| File | Written by | When to look at it |
|---|---|---|
| `spawn/<id>/spawn.yml` | Body (RFC 0024) | The body's invocation files. Three fields: `template:`, optional `depends_on:`, `params:`. The directory name is the child id. |
| `spawn/<id>/EXPANDED.md` | Framework (preview step) | The rendered template TASK.md with `{{...}}` substituted. Read this to verify expansion matches intent. |
| `spawn/<id>/EVIDENCE.json` | Framework (preview/apply) | Machine-readable per-child failure detail. Mirrors a row in STATUS.md. Useful from `converge inspect`; not on the AI's repair path. |
| `spawn/STATUS.md` | Framework (preview→apply) | The single AI-facing transparency surface. One `- [x]`/`- [ ]` row per invocation. Failed rows carry a `fix:` block (file + patch). |
| `spawn.plan.jsonl` | (Legacy) body | The pre-RFC-0024 manifest. New playbooks should use `spawn/<id>/spawn.yml` instead. |
| `spawn.plan.result.jsonl` | (Legacy) framework `converge apply` | Per-row outcome for the legacy manifest path. |
| `wave.counter` | Framework | The current wave number for a task with `converge:` config. |
| `halt.marker` | Converger body | Exists iff the body declared "I'm done this wave." Highest-priority halt signal. |
| `mode-violation.json` | Framework validator | One per failed invariant. Contains `errorCode`, `message`, `fixHint`. Read this first when a parent reports `FRONTIER_UNRESOLVED`. |

This same map appears in `converge-control/SKILL.md` (operator view) and `converge-development/reference/observability.md` (developer view). Keep them in sync.

---

## Picking behavior — decision heuristic

Most parents are easy:

- **Hand-write under `tasks/<id>/TASK.md`** when you have ≤7 children, known at plan time. No declaration needed — the parent picks up static children from disk.
- **`spawn:` config** when the child set is data-driven, larger than 7, or list-shaped (one per row in a JSON catalog, one per entry in a directory listing). Body iterates the catalog and writes one `<id>/spawn.yml` per row under `$CONVERGE_SPAWN_DIR`.
- **`converge:` config** when the loop's stopping point is a *check*, not a count — refine until a quality threshold, fix until tsc passes, iterate until no contradictions. Multi-wave by definition.
- **Empty body** when you want one sync point downstream tasks can depend on, instead of repeating a long `depends_on:` list.

**The catalog pattern.** Prefer "expected" over "adaptive" when designing a spawner: have an upstream task produce a structured catalog file (`tokens-catalog.json`, `shots.json`, etc.), then the downstream body reads it and emits one manifest row per entry. The result is a DAG whose dynamic children are still *predictable* — you can read the catalog before running and know what will spawn.

```
upstream catalog task          →  downstream body with spawn: config
writes tokens-catalog.json     →  reads it, emits one row per token
(concrete output)              →  (manifest is deterministic from the catalog)
```

One extra task makes the rest of the dynamic DAG queryable. Adaptive spawners (no catalog, the parent decides at runtime) are valid but harder to reason about — use them only when no catalog can exist.

---

## See also

- [RFC 0045 — Modes as internal, auto-inferred properties](../../../docs/rfcs/0045-streamline-task-mode.md) — the full RFC specifying removal of `mode:` declarations.
- [RFC 0024 — AI-native spawning](../../../docs/rfcs/0024-ai-native-spawning.md) — the `spawn.yml` invocation surface, STATUS.md, EXAMPLES.yml; what the AI authors.
- [`patterns.md`](./patterns.md) — common goal-tree shapes; which behavior each shape typically wants.
- [`schema.md`](./schema.md) — full frontmatter field reference (updated for RFC 0045).