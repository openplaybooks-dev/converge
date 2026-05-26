# Task Modes Reference

Load when authoring a parent task and deciding its `mode:`, or when a contract violation occurs.

---

## `mode: leaf`

Default. One agent produces one complete deliverable. No children.

```yaml
id: 03-render-card
mode: leaf
outputs:
  - lib/widgets/card.dart
checks:
  - id: card-exists
    cmd: test -f lib/widgets/card.dart
```

Body: write the files listed in `outputs:`.

---

## `mode: spawner`

One-shot fan-out. Body calls `ctx.loop.spawn()` per child from a template.

```yaml
id: 02-fan-out-shots
mode: spawner
spawn:
  min_children: 1
  max_children: 50
  apply: auto
checks:
  - id: spawn-clean
    cmd: '! grep -q "^- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md"'
```

Body: read upstream catalog, call `ctx.loop.spawn(target, { params: { key: value } })` per entry.

Never write child TASK.md files directly — templates own those.

---

## `mode: converger`

Multi-wave loop. Body re-runs each wave until halt fires.

```yaml
id: 04-fix-all-type-errors
mode: converger
converge:
  max_waves: 20
  halt_when:
    - id: types-clean
      cmd: pnpm tsc --noEmit
```

Body per wave: fix what the checks caught, call `ctx.loop.continue()`.

**Halt priority (first wins):**
1. `halt.marker` file exists → halt, success
2. Every `halt_when` check passes → halt, success
3. `wave_check` exits `0` → halt, success; exits `2` → give up; exits `1` → continue
4. `max_waves` exceeded → halt, fail

---

## `mode: gateway`

Sync point. No body, no outputs. Downstream depends on one edge instead of N.

```yaml
id: 09-staging-ready
mode: gateway
depends_on: [01-build, 02-test, 03-lint]
```

---

## Mode decision tree

```
Is the child list known at plan time with N ≤ 7?
  → static children under tasks/<id>/tasks/

Is the child list data-driven, large, or from a catalog?
  → mode: spawner

Does the task run multiple waves until checks pass?
  → mode: converger

Is it just a synchronization point with no own work?
  → mode: gateway
```

---

## Execution directory

Files the framework writes during execution:

| File | When |
|---|---|
| `spawn/STATUS.md` | One `- [x]`/`- [ ]` per child. Failed rows have a `fix:` block. |
| `spawn/<id>/EXPANDED.md` | Rendered template with `{{param}}` substituted. |
| `wave.counter` | Current wave number. Persists across crashes. |
| `halt.marker` | Body writes this to signal explicit halt. |
| `mode-violation.json` | Contract violation — `errorCode`, `message`, `fixHint`. |