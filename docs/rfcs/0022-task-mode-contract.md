---
rfc: 0022
title: Task mode contract — declared lifecycle, validated outcome
status: draft
type: feat
source: human
priority_tier: critical
estimate: "3-4 days"
backwards_compatible: yes
risk: high
---
# RFC 0022: Task mode contract — declared lifecycle, validated outcome

## Problem

A task that runs, exits 0, and produces no spawn manifest is indistinguishable from:

1. A task that wasn't supposed to spawn (correct).
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
| `task` *(default)* | Produce declared outputs, no children | Files at `outputs:` paths | Outputs exist; no `spawn.plan.jsonl`; no children registered for this task as parent |
| `spawner` | One-shot fan-out from a manifest | `spawn.plan.jsonl` + apply | Manifest applied; result file all `ok: true`; children registered; halts after one wave |
| `converger` | Multi-wave loop until a halt condition | New evidence each wave; optional manifest | Either a halt marker exists OR the wave check decides to continue; bounded by `max_waves:` |
| `gateway` | Synchronisation point; no own outputs | Nothing | All `depends_on:` complete; no spawn manifest expected |

Mode is **derivable from config block presence**, so the `mode:` line is optional in the recommended authoring shape (next section). When `mode:` is omitted, inference uses: `spawn:` block present ⇒ `spawner`; `converge:` block present ⇒ `converger`; legacy `passthrough: true` with `outputs: []` and body mentions `converge spawn`/`apply` ⇒ `spawner`; `passthrough: true` with empty body ⇒ `gateway`; otherwise ⇒ `task`. Authors can still declare `mode:` explicitly for parse-time tightening (e.g., `mode: spawner` without a `spawn:` block fails fast at parse instead of post-body).

### Recommended authoring shape: mode by inference from config

For human and AI authors alike, declaring `mode:` *and* a matching config block duplicates information. The recommended authoring shape is **omit `mode:` and let the framework derive it from observable signals**:

| Signal in frontmatter | Implies |
|---|---|
| `spawn:` block present | `spawner` |
| `converge:` block present | `converger` |
| `outputs: []` empty + TASK.md body empty | `gateway` |
| otherwise | `task` (default) |

This collapses the schema's three top-level knobs (`mode`, `spawn`, `converge`) to two. The `mode:` field survives as an optional disambiguator for the genuinely ambiguous case (a gateway with no signals at all) and as an opt-in tightener when the author wants the parse-time error to fire on a missing block. For the bulk of TASK.md files in the corpus the `mode:` line disappears.

Cross-field rules still apply: declaring both `spawn:` and `converge:` is rejected at parse ("can't be both spawner and converger"). All other current errors (`task-spawned`, `gateway-has-body`, `spawner-missing-manifest`, etc.) survive unchanged — they fire after inference resolves to a concrete mode.

The author's decision tree compresses from "pick one of four modes, then write its matching block" to two yes/no questions:

1. Does this task spawn? → declare `spawn:` (often just `min_children: N`).
2. Does this task loop? → declare `converge:` with `max_waves:` and a `halt:` check.

Anything else is a task.

### Mode-specific contracts

#### `mode: task`

```yaml
id: 03-render-card
mode: task
outputs:
  - lib/widgets/card.dart
checks:
  - id: card-exists
    cmd: test -f lib/widgets/card.dart
```

**Invariants checked after body:**
- Every path in `outputs:` exists.
- No `spawn.plan.jsonl` was written under `$CONVERGE_TASK_DIR`. If one exists, the task is rejected with `errorCode: "task-spawned"` — likely a misconfigured mode.
- No row in `tasks.jsonl` lists this task as `parent`. (Detects "I spawned via the legacy CLI without declaring spawner.")

**Repair hint when violated:**
> `mode: task` declared but body produced spawn manifest at `<path>`. Either change `mode:` to `spawner`, or remove the manifest write.

#### `mode: spawner`

```yaml
id: 02-fan-out-shots
spawn:
  min_children: 1         # the only knob the author typically sets
checks:
  - id: shots-applied-clean
    cmd: scripts/spawn-results-clean.sh
```

`mode: spawner` is inferred from the `spawn:` block (§"Recommended authoring shape"). The other `spawn:` keys exist but rarely need declaring:

- `template:` — a default template for rows that omit it. Most manifests set `template:` on every row, so this stays unset.
- `max_children:` — defaults to 1000. Bump only when bounding a fan-out is itself part of the contract.
- `apply: auto` — the default. The escape hatch `apply: manual` belongs in §Open questions; new spawners should not need it.

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
  halt:
    cmd: pnpm tsc --noEmit          # exit 0 ⇒ halt success; non-zero ⇒ next wave
```

**Body responsibility per wave:**
- Read state, do something (fix one error, run a tool, write a manifest, anything).
- Optionally write `$CONVERGE_TASK_DIR/spawn.plan.jsonl` if this wave needs to spawn children. Framework applies it.

**Result-file lifetime:** the framework truncates `$CONVERGE_TASK_DIR/spawn.plan.jsonl` and `spawn.plan.result.jsonl` at the start of each wave. Cross-wave state belongs in `$CONVERGE_TASK_DIR/state/` or in body-owned files; the manifest pair is wave-scoped by construction so a wave-N validator never reads a wave-(N-1) result.

**Invariants per wave:**
- Wave count ≤ `max_waves`. Exceeding it fails the task with `errorCode: "converger-max-waves"` — the repair loop must reconsider strategy, not loop more. `max_waves` is the give-up; there is no separate give-up signal.
- After each wave the `halt:` check runs. Exit 0 ⇒ halt with success. Non-zero ⇒ continue to the next wave (until `max_waves`). The framework also natively honours a `$CONVERGE_TASK_DIR/halt.marker` file written by the body (as a freebie that lets a body short-circuit without re-running the halt check) — this is an internal mechanism, not a separate schema knob.

**Repair hint when violated:**
> `mode: converger` reached `max_waves: <N>` without halting. Either raise `max_waves:`, tighten `halt:` to terminate sooner, or change the body strategy.

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
| Task produced no children (correct) | `mode: task`, no manifest expected, outputs verified |
| Spawner crashed before writing manifest | `mode: spawner`, no manifest = `spawner-missing-manifest` error, repairable |
| Converger between waves | `mode: converger`, `halt:` exited non-zero, framework re-leases |
| Spawner wrote empty manifest | `mode: spawner`, `min_children: 1` violated, `errorCode: "spawner-empty-manifest"` |
| Passthrough with nothing to do | `mode: gateway`, expected to be silent |

Five outcomes, five distinct error codes (or success), zero overlap.

### Composition with RFC 0021 (apply)

`mode:` is the *contract*; `spawn.plan.jsonl` + `converge apply` is the *mechanism*. They're orthogonal but reinforce each other:

- `mode: task` → framework rejects any `spawn.plan.jsonl` it finds (suspicious).
- `mode: spawner` → framework auto-runs `converge apply` after the body, so the body never has to. One less line in TASK.md, one less failure mode.
- `mode: converger` → framework auto-runs `converge apply` per wave if a manifest exists.
- `mode: gateway` → framework skips the body entirely.

The `apply: auto` default in spawner removes the most common authoring mistake (forgetting to call apply after writing the manifest).

## Code-level design

### 1. Schema extension

`packages/core/src/config/task-md-schema.ts`:

```ts
export const TaskModeSchema = z.enum(["task", "spawner", "converger", "gateway"]);

export const SpawnerConfigSchema = z.object({
  template: z.string().optional(),       // default template for rows that omit it
  min_children: z.number().int().min(0).default(0),
  max_children: z.number().int().min(1).default(1000),
  apply: z.enum(["auto", "manual"]).default("auto"),
});

export const ConvergerConfigSchema = z.object({
  max_waves: z.number().int().min(1).default(10),
  halt: CheckSchema.optional(),     // exit 0 ⇒ halt success; non-zero ⇒ next wave
});

// Back-compat: a legacy `halt_when: [...]` array parses by collapsing into a
// single `halt:` check (a generated `scripts/halt-all.sh` AND's the conditions);
// a legacy `wave_check:` parses by mapping `exit 0 ⇒ halt`, anything else ⇒
// continue. The 0/1/2 protocol is removed — `max_waves` is the only give-up.

export const TaskMdFrontmatterSchema = z.object({
  // ...existing fields...
  mode: TaskModeSchema.optional(),
  spawn: SpawnerConfigSchema.optional(),
  converge: ConvergerConfigSchema.optional(),
});
```

Cross-field validation:
- `mode: spawner` requires `spawn:` (filled with defaults if absent).
- `mode: converger` requires `converge:` and a `halt:` check (the only halt signal in the schema; `max_waves` is the structural backstop, not a user-facing halt).
- `mode: task` rejects `spawn:` or `converge:` blocks.
- `mode: gateway` rejects body content (TASK.md body must be empty or whitespace).

### 2. Mode inference (back-compat)

`packages/core/src/task/mode-inference.ts`:

```ts
export function inferMode(task: ParsedTaskMd): TaskMode {
  if (task.mode) return task.mode;
  // Config blocks win — they're the authoring-recommended signal.
  if (task.spawn) return "spawner";
  if (task.converge) return "converger";
  // Legacy: passthrough + body shape, for TASK.md files that pre-date
  // the spawn:/converge: blocks. Removable once examples are swept.
  if (task.passthrough && (task.outputs?.length ?? 0) === 0) {
    if (bodyMentionsSpawn(task.body)) return "spawner";
    return "gateway";
  }
  return "task";
}
```

The `seed: { mode: cli }` branch from earlier drafts is removed — the TASK.md parser already rejects legacy `seeds:` blocks at parse time (`task-md-definition.ts`), so an inference rule for them would be unreachable dead code.

Logged once per task at first parse only when inference disagrees with the most-derivable form: `task <id>: mode inferred as <mode> from legacy signals; consider declaring spawn:/converge: or removing passthrough:`. New playbooks that declare `spawn:`/`converge:` directly never see the warning.

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
  | "task-spawned"              // task wrote a manifest
  | "task-has-children"         // task has rows in tasks.jsonl with this as parent
  | "spawner-missing-manifest"  // spawner produced no manifest
  | "spawner-empty-manifest"    // spawner wrote manifest with 0 rows
  | "spawner-row-count"         // outside [min_children, max_children]
  | "spawner-apply-failed"      // result file has any ok:false
  | "converger-no-halt-signal"  // halt: missing (schema would normally reject)
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
  // Truncate the wave-scoped manifest pair so a wave-N validator never reads
  // wave-(N-1) results. Cross-wave state lives elsewhere (see §mode: converger).
  await resetExecDirForWave(ctx);
  await runBody(task, ctx);
  // Freebie short-circuit: body may write halt.marker if it knows it's done.
  if (existsSync(join(ctx.taskDir, "halt.marker"))) {
    return { halt: true, success: true, reason: "halt-marker" };
  }
  if (task.converge.halt) {
    const exit = await runCheck(task.converge.halt, ctx);
    if (exit === 0) return { halt: true, success: true, reason: "halt-pass" };
    return { halt: false };
  }
  // No halt mechanism — refused at schema validation time, but defend anyway.
  return { halt: true, success: false, errorCode: "converger-no-halt-signal" };
}
```

The runtime drives the wave loop with explicit re-leasing between waves. Today's "container re-leases itself in a hot loop" pathology (RFC 0020) becomes structurally impossible: the wave count is bounded by `max_waves`, there is exactly one halt knob (`halt:` exit 0), and the manifest pair is wave-scoped so stale results can't lie about the current wave.

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

**Branch on body-crash first.** A mode violation like `spawner-missing-manifest` admits two root causes: (1) the author meant the wrong mode (correct fix: change `mode:` or write the manifest), or (2) the body crashed before reaching the manifest write (correct fix: debug the body). The repair-loop prompt MUST surface the body's exit code and last ~50 lines of stderr **before** the mode-violation message, so the agent reads "body exited 137 at line 42 with OOM" before being asked to re-emit a manifest. Without this, the agent fixes the symptom instead of the cause and the next attempt re-crashes.

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
- Stay on inference indefinitely — `mode:` is derived from config block presence, never required. The §"Recommended authoring shape" section above is the steady state, not a transitional step. Inference code stays in `task/mode/inference.ts`; the one-time warning is reframed as "consider removing redundant `mode:` line" rather than "declare mode explicitly."
- `passthrough:` survives — it expresses executor selection (skip AI, run shell), an axis orthogonal to `mode:` (lifecycle contract). See Open Question #3 resolution.

## Test plan

`packages/core/src/task/lifecycle/__tests__/mode-validator.test.ts`:

1. **task-happy** — `mode: task`, body produces all `outputs:`, no manifest → ok.
2. **task-spawned** — `mode: task`, body writes `spawn.plan.jsonl` → fails with `errorCode: "task-spawned"`.
3. **task-has-children** — `mode: task`, body calls legacy `converge spawn` → fails with `errorCode: "task-has-children"`.
4. **spawner-happy** — `mode: spawner`, body writes 3-row manifest, framework applies, all ok → task converges.
5. **spawner-missing-manifest** — `mode: spawner`, body writes nothing → `errorCode: "spawner-missing-manifest"`.
6. **spawner-empty-manifest** — `mode: spawner`, manifest has 0 rows, `min_children: 1` → `errorCode: "spawner-empty-manifest"`.
7. **spawner-row-count** — `min_children: 5`, manifest has 3 → `errorCode: "spawner-row-count"`.
8. **spawner-apply-failed** — manifest has 3 rows, 1 has missing var → apply fails → `errorCode: "spawner-apply-failed"`.
9. **converger-halt-marker** — body writes `halt.marker` after wave 2 → halts at wave 2.
10. **converger-halt-check** — `halt:` exit 0 after wave 3 → halts at wave 3.
11. **converger-halt-continue** — `halt:` exit 1 for 4 waves, then 0 → halts at wave 5.
12. **converger-max-waves** — `max_waves: 5`, no halt → `errorCode: "converger-max-waves"`.
13. **converger-wave-scoped-results** — wave 2 writes a manifest with one ok:false row; wave 3 writes a clean manifest. Validator at wave 3 sees fresh results, no stale ok:false leakage.
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
- **Not** subsuming `passthrough:` into `mode:`. `passthrough:` is an *executor* selector (skip the AI agent, run the body shell directly); `mode:` is a *lifecycle contract* (what the body must produce). They're orthogonal axes — a deterministic, AI-free spawner is `passthrough: true` + `spawn:`, and that's a valid, useful combination.

## Open questions

1. **Should `mode:` be required immediately?** **Resolved: no, never required.** Mode is derived from `spawn:` / `converge:` block presence (§"Recommended authoring shape"). Requiring `mode:` codifies redundancy with the matching config block; the derived shape is the steady state.

2. **Should `apply: manual` exist?** Spawner that writes the manifest but does its own apply (e.g., needs to inspect the result file mid-body). Lean: yes — covers escape-hatch cases like "spawn, see results, spawn more in the same wave" — but make `auto` the default and the documented norm.

3. **Should `gateway` be allowed checks?** Cross-dependency consistency checks ("all upstream artefacts agree") are useful at sync points. Lean: yes, allow `checks:` on gateway; the body just stays empty.

4. **Wave-check exit-code protocol.** **Resolved: dropped.** The schema has one user-facing halt knob — `halt:` — and the protocol is "exit 0 ⇒ halt success; non-zero ⇒ continue." There is no "exit 2 ⇒ give up" — `max_waves` is the only structural give-up signal, which surfaces as `errorCode: "converger-max-waves"` so the repair loop can reconsider strategy. The `halt.marker` file is a framework-internal mechanism (the body may write it as a freebie); it is not part of the TASK.md schema surface.

5. **Interaction with `discoverStaticChildren`.** Static children under `tasks/` are today picked up at compile time. Should a parent with static children require `mode: spawner` declaring them? Lean: a parent with static children is implicitly `mode: spawner` with `apply: none` — the framework already enumerated the children, no manifest needed. Document this as a fifth implicit form (compile-time spawner).

## Why now

RFC 0020 surfaced one observable bug (re-lease loop) caused by mode-ambiguity. RFC 0021 makes spawning a structured transaction but doesn't say *whether* a task should have spawned. Together with 0022 the runtime has:

- **0021**: a typed, file-driven mechanism for spawning.
- **0022**: a typed, declared lifecycle the body must satisfy.

Neither alone removes the ambiguity classes that cause silent failures. Both together make every task's intent and outcome inspectable, validatable, and addressable by the repair loop.
