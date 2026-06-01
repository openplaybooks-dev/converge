---
status: proposed
---

# RFC 0045 — Modes as Internal, Auto-Inferred Properties

## Summary

Remove `mode:` from TASK.md frontmatter entirely. Task behavior is determined by what the task **does** (post-body inspection), not what it **declares**. All tasks run their body the same way; the framework derives the mode after execution:

- **task** (default): ran body, produced outputs, no children manifest → done
- **spawner**: ran body, wrote `spawn.plan.jsonl` → apply children
- **converger**: ran body, has `converge: { max_waves, halt_when }` config → run wave loop
- **gateway**: body is empty (no skill, no bash fences) → completes immediately as sync point

`passthrough` becomes internal-only (drives the "empty body = gateway" behavior). Users don't declare it.

---

## What Changes

### 1. Remove `mode:` from frontmatter

`mode:` is no longer a declared field. Tasks run their body; the framework classifies after execution.

### 2. Simplify mode to 3 internal states (plus gateway)

From the user's perspective, there's only one kind of task: a task that runs its body. The distinction between task/spawner/converger is purely internal — the framework inspects what the task produced to decide what happens next.

| Internal Mode | Trigger | After body runs |
|---|---|---|
| `task` | default (no other trigger) | check outputs, done |
| `spawner` | `spawn.plan.jsonl` exists after body | apply children |
| `converger` | `converge: { ... }` config in TASK.md frontmatter | run wave loop |
| `gateway` | body is empty (no skill, no bash fences) | done immediately |

The user writes the body. The framework decides the mode from what exists after execution.

### 3. Remove mode inference logic entirely

No more body-scan for spawn verbs. No more `passthrough` signal. `inference.ts` becomes a one-line passthrough:

```typescript
// All tasks default to task unless converge: config is present.
export function inferMode(input: ModeInferenceInput): TaskMode {
  return "task";
}
```

### 4. Keep `passthrough` internal

`passthrough` is no longer a frontmatter field. It's set internally by the framework when the body is empty (gateway case). Users don't write it.

### 5. Remove mode dispatch from run-executor.ts

The typed mode dispatch (spawner/converger/gateway branches) is replaced by a single behavior:

```
run body → check what exists → apply appropriate next step
```

### 6. `spawn:` block — keep as optional config

`spawn: { min_children, max_children, apply }` stays in frontmatter as optional config. Even without mode declarations, the spawn: block is still validated at parse time (row count bounds, apply: auto/manual). Post-body validator checks row count against these bounds when the manifest exists.

### 7. Empty body detection — runtime check

**File:** `packages/core/src/navigator/core/actions/execution/run-executor.ts`

A task is a gateway (completes immediately) when:
- No skill is declared (`resolveSkill(unit)` returns falsy)
- No ```bash fences exist in the parsed TASK.md body

Detection happens at runtime by parsing the TASK.md (or checking the parsed def) — same as the current `isPassthrough` re-parse in `task-run.ts:276` but applied to determine gateway vs. task instead of passthrough vs. AI path.

---

## Files to change

### packages/core/src/task/mode/schema.ts
Remove `mode` from `RawModeInput`, remove cross-field validation (spawn+/converge+ mode rules), keep `SpawnerConfigSchema` and `ConvergerConfigSchema` as config-only fields.

### packages/core/src/task/mode/inference.ts
Collapse to one line: all tasks are `task` unless `converge:` config is present.

### packages/core/src/config/task-md-definition.ts
Remove `mode` from `TaskMdShape`, `FrontMatterDef`, parse path, serialization. Keep `spawn:` and `converge:` blocks as config-only fields.

### packages/core/src/task/mode/inference.ts
Collapse to one line: all tasks are `task` unless `converge:` config is present.

### packages/core/src/config/task-md-definition.ts
Remove `mode` from `TaskMdShape`, `FrontMatterDef`, parse path, serialization. Keep `spawn:` and `converge:` blocks as config-only fields.

### packages/core/src/config/task-definition.ts
Remove `mode?: TaskMode` from `TaskDefinition` interface. Keep `convergeConfig?` (this is the converger config).

### packages/core/src/task/unit/unit.ts
Remove `mode?: TaskMode`, `spawn?`, `modeConverge?` from Unit. These become runtime-derived, not on the Unit itself.

### packages/core/src/navigator/core/actions/execution/run-executor.ts
Replace mode dispatch with behavior inspection:
```
1. Run body (via skill or passthrough)
2. If spawn.plan.jsonl exists → apply children (spawner behavior)
3. If converge: config present → run wave loop (converger behavior)
4. If body empty → done immediately (gateway behavior)
5. Else → check outputs, done (task behavior)
```

### packages/core/src/manifest/types.ts
Remove `dag_type`, `converge_passthrough`, `passthrough` from `RunStateNode`. Mode is no longer stored on the node — it's derived at runtime.

### packages/core/src/run/execute-task.ts
Simplify: run body → inspect → apply next step.

---

## Migration

Old playbooks with `mode: spawner/converger/gateway` in frontmatter:
- `mode: spawner` → remove declaration, keep `spawn:` block if needed
- `mode: converger` → remove declaration, keep `converge:` block (already present)
- `mode: gateway` → remove declaration, empty body already works
- `passthrough: true` → remove, no longer needed

No silent breakage — if a task wrote a spawn manifest without declaring `mode: spawner`, the framework sees it and applies it. The behavior is the same; the declaration is gone.

---

## Why this works

Users should think about **what the task does** (write code, spawn children, loop), not **what mode it is**. The framework inspects the result and applies the right next step.

Mode declarations were a form of over-specification. The body is the source of truth. The framework reads the artifacts and decides.

---

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written and proposed |
| Remove mode: from schema | **pending** | schema.ts, task-md-definition.ts |
| Collapse inference to task-default | **pending** | inference.ts |
| Remove mode from TaskDefinition/Unit | **pending** | task-definition.ts, unit.ts |
| Simplify run-executor dispatch | **pending** | run-executor.ts |
| Remove dag_type/passthrough from run-state | **pending** | manifest/types.ts |
| Update examples | **pending** | Remove mode declarations |
| pnpm build + tests | **pending** | Regression check |