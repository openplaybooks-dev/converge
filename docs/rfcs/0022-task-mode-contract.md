# RFC 0022: Task mode contract — declared lifecycle, validated outcome

**Status**: Draft
**Backwards-compatible**: Yes (additive; missing `mode:` infers today's behaviour)
**Estimate**: 3-4 days
**Companion to**: RFC 0021 (declarative spawn apply). 0021 makes spawning a file-driven transaction; 0022 makes the *intent* explicit so the framework can verify the transaction happened.

## Problem

A task that runs, exits 0, and produces no spawn manifest is indistinguishable from:

1. A leaf task that wasn't supposed to spawn (correct).
2. A spawner that crashed before writing its manifest (silent failure).
3. A converger waiting for the next wave (correct, but should re-lease).
4. A spawner that wrote an empty manifest (probably a bug).
5. A passthrough that intentionally has nothing to do this wave (correct).

The only signal today is `passthrough: true`, which is binary, untyped, and doesn't validate any of the post-conditions. RFC 0020 documents one consequence: containers re-lease in tight loops at 9000+ attempts because the convergence detector can't tell "done" from "did nothing this wave."

The repair agent suffers the same ambiguity. When a passthrough task fails its check, the agent has to guess whether to:
- Spawn more children (the task was supposed to but didn't).
- Wait (the task is a converger between waves).
- Mark itself done (the task is finished but didn't say so).
- Fix the children (the task spawned correctly but the children failed).

All four require different actions; only one is right per task.

## Proposal

Add a typed `mode:` field to TASK.md frontmatter. Each mode is a contract: a precise statement of what the body is allowed to do and what artefacts must exist after it runs. The runtime enforces the contract and surfaces violations as structured errors the repair loop can address.

Four modes — covering every shape the framework runs today:

| `mode:` | Intent | Body produces | Post-body invariant |
|---|---|---|---|
| `leaf` *(default)* | Produce declared outputs, no children | Files at `outputs:` paths | Outputs exist; no `spawn.plan.jsonl`; no children registered for this task as parent |
| `spawner` | One-shot fan-out from a manifest | `spawn.plan.jsonl` + apply | Manifest applied; result file all `ok: true`; children registered; halts after one wave |
| `converger` | Multi-wave loop until a halt condition | New evidence each wave; optional manifest | Either a halt marker exists OR the wave check decides to continue; bounded by `max_waves:` |
| `gateway` | Synchronisation point; no own outputs | Nothing | All `depends_on:` complete; no spawn manifest expected |

Every task declares one. Missing `mode:` infers `leaf` if `outputs:` is non-empty, `spawner` if the body emits any `converge spawn`/`apply` call (detected at parse), `converger` if `seed: { mode: cli }` is set. Inference is a back-compat shim, not a feature; new playbooks declare explicitly.

### Mode-specific contracts

#### `mode: leaf`

```yaml
id: 03-render-card
mode: leaf
outputs:
  - lib/widgets/card.dart
checks:
  - id: card-exists
    cmd: test -f lib/widgets/card.dart
```

**Invariants checked after body:**
- Every path in `outputs:` exists.
- No `spawn.plan.jsonl` was written under `$CONVERGE_TASK_DIR`. If one exists, the task is rejected with `errorCode: "leaf-spawned"` — likely a misconfigured mode.
- No row in `tasks.jsonl` lists this task as `parent`. (Detects "I spawned via the legacy CLI without declaring spawner.")

**Repair hint when violated:**
> `mode: leaf` declared but body produced spawn manifest at `<path>`. Either change `mode:` to `spawner`, or remove the manifest write.

#### `mode: spawner`

```yaml
id: 02-fan-out-shots
mode: spawner
spawn:
  template: shot          # default template if rows omit it
  min_children: 1
  max_children: 50
  apply: auto             # framework calls `converge apply` after body; default = auto
checks:
  - id: shots-applied-clean
    cmd: scripts/spawn-results-clean.sh
```

**Body responsibility:**
- Write `$CONVERGE_TASK_DIR/spawn.plan.jsonl` with one row per child.
- Do **not** call `converge apply` directly. The framework does it once, after the body, when `apply: auto` (the default).

**Invariants checked after body:**
- `spawn.plan.jsonl` exists and parses as valid JSONL with rows matching `SpawnRowSchema` (RFC 0021).
- Row count is in `[min_children, max_children]`.
- After framework-driven apply, every row in `spawn.plan.result.jsonl` has `"ok": true`.

**Halt:** spawner is a one-shot. After children complete and the parent's `checks:` pass, the parent converges. The body never re-runs unless a child re-runs and the parent's check goes red.

**Repair hint when violated:**
> `mode: spawner` declared but `spawn.plan.jsonl` is missing/empty/invalid. Write the manifest at `$CONVERGE_TASK_DIR/spawn.plan.jsonl` describing the children to spawn. See RFC 0021 §schema for the row format.

#### `mode: converger`

```yaml
id: 04-fix-all-type-errors
mode: converger
converge:
  max_waves: 20
  halt_when:
    - id: zero-type-errors
      cmd: pnpm tsc --noEmit
  wave_check:                    # runs after each wave to decide continue/halt
    cmd: scripts/wave-decision.sh
```

**Body responsibility per wave:**
- Read state, do something (fix one error, run a tool, write a manifest, anything).
- Optionally write `$CONVERGE_TASK_DIR/spawn.plan.jsonl` if this wave needs to spawn children. Framework applies it.
- Optionally write `$CONVERGE_TASK_DIR/halt.marker` if the body knows it's done (e.g., the tool reported zero errors).

**Invariants per wave:**
- Wave count ≤ `max_waves`. Exceeding it fails the task with `errorCode: "max-waves-exceeded"` — the repair loop must reconsider strategy, not loop more.
- After each wave, **exactly one** halt signal is checked, in this priority:
  1. `$CONVERGE_TASK_DIR/halt.marker` exists → halt, success.
  2. Every check in `halt_when:` passes → halt, success.
  3. `wave_check` exits 0 → halt, success.
  4. `wave_check` exits 2 → halt, fail (give up).
  5. `wave_check` exits 1 → continue, next wave.

**Repair hint when violated:**
> `mode: converger` reached `max_waves: <N>` without halting. Either raise `max_waves:`, tighten `halt_when:` to terminate sooner, or change the body strategy.

#### `mode: gateway`

```yaml
id: 09-staging-ready
mode: gateway
depends_on: [01-build, 02-test, 03-lint]
```

No body, no outputs, no checks beyond "all `depends_on:` are complete." Materialised as a no-op task so downstream tasks have one edge to depend on instead of N.

**Invariants:**
- No body provided (or body is a no-op).
- No `spawn.plan.jsonl`.
- No `outputs:`.

Replaces today's "passthrough with empty body" idiom, which is what `passthrough: true` mostly means in practice.

### How this nukes the ambiguity classes

Going back to the five-way silence problem:

| Old reading | Mode-aware reading |
|---|---|
| Leaf produced no children (correct) | `mode: leaf`, no manifest expected, outputs verified |
| Spawner crashed before writing manifest | `mode: spawner`, no manifest = `spawner-missing-manifest` error, repairable |
| Converger between waves | `mode: converger`, wave_check returned 1, framework re-leases |
| Spawner wrote empty manifest | `mode: spawner`, `min_children: 1` violated, `errorCode: "spawner-empty-manifest"` |
| Passthrough with nothing to do | `mode: gateway`, expected to be silent |

Five outcomes, five distinct error codes (or success), zero overlap.

### Composition with RFC 0021 (apply)

`mode:` is the *contract*; `spawn.plan.jsonl` + `converge apply` is the *mechanism*. They're orthogonal but reinforce each other:

- `mode: leaf` → framework rejects any `spawn.plan.jsonl` it finds (suspicious).
- `mode: spawner` → framework auto-runs `converge apply` after the body, so the body never has to. One less line in TASK.md, one less failure mode.
- `mode: converger` → framework auto-runs `converge apply` per wave if a manifest exists.
- `mode: gateway` → framework skips the body entirely.

The `apply: auto` default in spawner removes the most common authoring mistake (forgetting to call apply after writing the manifest).

## Code-level design

### 1. Schema extension

`packages/core/src/config/task-md-schema.ts`:

```ts
export const TaskModeSchema = z.enum(["leaf", "spawner", "converger", "gateway"]);

export const SpawnerConfigSchema = z.object({
  template: z.string().optional(),       // default template for rows that omit it
  min_children: z.number().int().min(0).default(0),
  max_children: z.number().int().min(1).default(1000),
  apply: z.enum(["auto", "manual"]).default("auto"),
});

export const ConvergerConfigSchema = z.object({
  max_waves: z.number().int().min(1).default(10),
  halt_when: z.array(CheckSchema).optional(),
  wave_check: CheckSchema.optional(),
});

export const TaskMdFrontmatterSchema = z.object({
  // ...existing fields...
  mode: TaskModeSchema.optional(),
  spawn: SpawnerConfigSchema.optional(),
  converge: ConvergerConfigSchema.optional(),
});
```

Cross-field validation:
- `mode: spawner` requires `spawn:` (filled with defaults if absent).
- `mode: converger` requires `converge:` and at least one of `halt_when` / `wave_check`.
- `mode: leaf` rejects `spawn:` or `converge:` blocks.
- `mode: gateway` rejects body content (TASK.md body must be empty or whitespace).

### 2. Mode inference (back-compat)

`packages/core/src/task/mode-inference.ts`:

```ts
export function inferMode(task: ParsedTaskMd): TaskMode {
  if (task.mode) return task.mode;
  if (task.passthrough && (task.outputs?.length ?? 0) === 0) {
    if (task.seed) return "converger";
    if (bodyMentionsSpawn(task.body)) return "spawner";
    return "gateway";
  }
  return "leaf";
}
```

Logged once per task at first parse: `task <id>: mode inferred as <mode>; declare explicitly to silence this warning`.

### 3. Pre-body and post-body validators

`packages/core/src/task/lifecycle/mode-validator.ts`:

```ts
export interface ModeValidation {
  ok: boolean;
  errorCode?: ModeErrorCode;
  message?: string;
  fixHint?: string;
}

export type ModeErrorCode =
  | "leaf-spawned"              // leaf wrote a manifest
  | "leaf-has-children"         // leaf has rows in tasks.jsonl with this as parent
  | "spawner-missing-manifest"  // spawner produced no manifest
  | "spawner-empty-manifest"    // spawner wrote manifest with 0 rows
  | "spawner-row-count"         // outside [min_children, max_children]
  | "spawner-apply-failed"      // result file has any ok:false
  | "converger-no-halt-signal"  // wave_check + halt_when both absent
  | "converger-max-waves"       // exceeded max_waves
  | "gateway-has-body"
  | "gateway-spawned";

export function validatePostBody(task: TaskWithMode, taskDir: string): ModeValidation;
```

Hooked into `task/lifecycle/after.ts` immediately after the body returns and before the task's own `checks:` run. A mode violation short-circuits the check phase and writes a structured failure to the journal.

### 4. Spawner auto-apply

The executor, when `mode: spawner` and `spawn.apply === "auto"`:

```
1. Run body.
2. If $CONVERGE_TASK_DIR/spawn.plan.jsonl exists → run converge apply on it.
3. Run mode validator (which checks the result file).
4. Run task's declared checks.
```

The body never calls `converge apply` itself in `auto` mode. This eliminates the "wrote the manifest but forgot to apply it" failure class.

### 5. Converger wave loop

`packages/core/src/task/lifecycle/converger.ts`:

```ts
export async function runConvergerWave(task: ConvergerTask, ctx: TaskContext): Promise<WaveOutcome> {
  if (ctx.waveNumber > task.converge.max_waves) {
    return { halt: true, success: false, errorCode: "converger-max-waves" };
  }
  await runBody(task, ctx);
  if (existsSync(join(ctx.taskDir, "halt.marker"))) {
    return { halt: true, success: true, reason: "halt-marker" };
  }
  if (task.converge.halt_when) {
    const allPass = await runChecks(task.converge.halt_when, ctx);
    if (allPass) return { halt: true, success: true, reason: "halt-when" };
  }
  if (task.converge.wave_check) {
    const exit = await runCheck(task.converge.wave_check, ctx);
    if (exit === 0) return { halt: true, success: true, reason: "wave-check-pass" };
    if (exit === 2) return { halt: true, success: false, reason: "wave-check-give-up" };
    return { halt: false };
  }
  // No halt mechanism — refused at schema validation time, but defend anyway.
  return { halt: true, success: false, errorCode: "converger-no-halt-signal" };
}
```

The runtime drives the wave loop with explicit re-leasing between waves. Today's "container re-leases itself in a hot loop" pathology (RFC 0020) becomes structurally impossible: the wave count is bounded, halt signals are explicit, the wave_check exit-code protocol is fixed.

### 6. Repair-loop integration

When `validatePostBody` returns a violation, the framework writes to `$CONVERGE_TASK_DIR/mode-violation.json`:

```json
{
  "errorCode": "spawner-missing-manifest",
  "declaredMode": "spawner",
  "message": "mode: spawner declared but no spawn.plan.jsonl was written",
  "fixHint": "Write a manifest at $CONVERGE_TASK_DIR/spawn.plan.jsonl with one row per child. See RFC 0021 for the row schema.",
  "expectedArtefacts": ["spawn.plan.jsonl"],
  "actualArtefacts": []
}
```

The repair agent's prompt includes this file alongside the existing `retry-context.json` (RFC 0009). The agent now knows exactly which mode-contract it broke and what to do about it.

### 7. Validator command

`converge validate-mode <task-id>` — runs the post-body validator against the current state of `$CONVERGE_TASK_DIR` without re-running the body. Useful for debugging and for the CI lane that wants to assert "this playbook is mode-valid."

## Migration

Phase 1 (this RFC):
- Land schema, inference, validators.
- Auto-infer for every existing task; emit one-time warnings.
- New playbooks scaffolded by `converge add` declare `mode:` explicitly.

Phase 2:
- Sweep examples (`examples/deep-research`, `examples/baby-app`, `examples/cinematic-video-production`) to declare `mode:` explicitly.
- Update `skills/converge-planning/SKILL.md` §1 ("three task shapes" → four modes) and the directory-layout example.

Phase 3 (later RFC):
- Make `mode:` required; remove inference; emit a clean error on missing.
- Remove `passthrough:` (it's fully subsumed by `mode: gateway` + `mode: converger`).

## Test plan

`packages/core/src/task/lifecycle/__tests__/mode-validator.test.ts`:

1. **leaf-happy** — `mode: leaf`, body produces all `outputs:`, no manifest → ok.
2. **leaf-spawned** — `mode: leaf`, body writes `spawn.plan.jsonl` → fails with `errorCode: "leaf-spawned"`.
3. **leaf-has-children** — `mode: leaf`, body calls legacy `converge spawn` → fails with `errorCode: "leaf-has-children"`.
4. **spawner-happy** — `mode: spawner`, body writes 3-row manifest, framework applies, all ok → task converges.
5. **spawner-missing-manifest** — `mode: spawner`, body writes nothing → `errorCode: "spawner-missing-manifest"`.
6. **spawner-empty-manifest** — `mode: spawner`, manifest has 0 rows, `min_children: 1` → `errorCode: "spawner-empty-manifest"`.
7. **spawner-row-count** — `min_children: 5`, manifest has 3 → `errorCode: "spawner-row-count"`.
8. **spawner-apply-failed** — manifest has 3 rows, 1 has missing var → apply fails → `errorCode: "spawner-apply-failed"`.
9. **converger-halt-marker** — body writes `halt.marker` after wave 2 → halts at wave 2.
10. **converger-halt-when** — `halt_when` check passes after wave 3 → halts at wave 3.
11. **converger-wave-check-continue** — `wave_check` returns 1 for 4 waves, then 0 → halts at wave 5.
12. **converger-give-up** — `wave_check` returns 2 → halts with success: false.
13. **converger-max-waves** — `max_waves: 5`, no halt → `errorCode: "converger-max-waves"`.
14. **gateway-happy** — `mode: gateway`, all deps complete → ok, body never runs.
15. **gateway-has-body** — `mode: gateway` declared, TASK.md has body content → schema rejection at parse.

Integration test under `tests/test-mode-validation/`:
- Four tasks, one per mode, fail-paths exercised end-to-end through the repair loop.

## Why this is worth it

Three observable wins:

1. **Repair agent stops guessing.** "What was this task supposed to do?" is no longer a free-text question; it's a typed enum + a violated invariant + a fix hint. The retry context is precise.

2. **The infinite-loop bug class disappears structurally.** RFC 0020's 9000-attempt re-lease loop happened because the runtime couldn't tell "done" from "in-progress." A converger has `max_waves` and explicit halt signals; a spawner is one-shot; a gateway has no body. None of them can loop indefinitely by accident.

3. **The planning skill collapses from prose to a flowchart.** "Pick a mode. The schema tells you what's required." Today's "static container vs. dynamic container vs. passthrough vs. seed" decision tree (planning skill §3, §8) becomes a four-way enum.

## Anti-goals

- **Not** adding more modes. Four is enough; resist the urge to add `pipeline`, `epoch`, `branch`, etc. — they all decompose into combinations of the four.
- **Not** changing how children execute. A child task in any mode looks like a normal task to its own executor.
- **Not** moving DAG semantics into mode. `depends_on:` is unchanged. Mode is about *body lifecycle*, not graph shape.
- **Not** removing seed scripts (`seed: { script: ... }`). They're a body-shape choice within `spawner` or `converger`, not a mode.

## Open questions

1. **Should `mode:` be required immediately?** Lean: no — auto-infer for one release, then require. The migration cost is low (one line per TASK.md) but forcing it gates adoption.

2. **Should `apply: manual` exist?** Spawner that writes the manifest but does its own apply (e.g., needs to inspect the result file mid-body). Lean: yes — covers escape-hatch cases like "spawn, see results, spawn more in the same wave" — but make `auto` the default and the documented norm.

3. **Should `gateway` be allowed checks?** Cross-dependency consistency checks ("all upstream artefacts agree") are useful at sync points. Lean: yes, allow `checks:` on gateway; the body just stays empty.

4. **Wave-check exit-code protocol.** Reusing 0/1/2 for halt-success/continue/halt-fail mirrors `git`'s convention but conflicts with normal shell ergonomics where 2 = misuse. Alternative: a `halt.marker` with JSON content `{"halt": true, "success": false}`. Lean: support both — exit code is the simple path, marker file is the structured path.

5. **Interaction with `discoverStaticChildren`.** Static children under `tasks/` are today picked up at compile time. Should a parent with static children require `mode: spawner` declaring them? Lean: a parent with static children is implicitly `mode: spawner` with `apply: none` — the framework already enumerated the children, no manifest needed. Document this as a fifth implicit form (compile-time spawner).

## Why now

RFC 0020 surfaced one observable bug (re-lease loop) caused by mode-ambiguity. RFC 0021 makes spawning a structured transaction but doesn't say *whether* a task should have spawned. Together with 0022 the runtime has:

- **0021**: a typed, file-driven mechanism for spawning.
- **0022**: a typed, declared lifecycle the body must satisfy.

Neither alone removes the ambiguity classes that cause silent failures. Both together make every task's intent and outcome inspectable, validatable, and addressable by the repair loop.
