# Task Modes

Load when assigning a mode to a parent task, or when a contract violation occurs.

---

## The four modes

| Mode | Use when | Body |
|---|---|---|
| `task` (default) | One agent produces one complete deliverable. No children. | Write the outputs. |
| `spawner` | Child list is data-driven or from runtime data. | Call `ctx.loop.spawn()` per child. |
| `converger` | Multi-wave loop until checks pass. | Loop: fix → `ctx.loop.continue()` until `halt_when` fires. |
| `gateway` | Sync point — no own work. | Empty. |

**Ordering via inputs:.** Do not write `depends_on:` in task frontmatter. Sibling order is determined by `inputs:` — if task B reads A's output path, B runs after A.

---

## Mode decision tree

```
Is the child list known at plan time?
  → static children under tasks/<id>/tasks/
  → ordering via inputs: (sibling A's output is sibling B's input)

Is the child list data-driven or from runtime data?
  → mode: spawner

Does the task run multiple waves until checks pass?
  → mode: converger

Is it just a synchronization point with no own work?
  → mode: gateway
```

---

## task

One agent produces one complete deliverable. No children.

```yaml
id: render-card
mode: task
outputs:
  - lib/widgets/card.dart
checks:
  - id: card-exists
    cmd: test -f lib/widgets/card.dart
```

Body: write the files listed in `outputs:`.

---

## spawner

One-shot fan-out. Body calls `ctx.loop.spawn()` per child from a template.

```yaml
id: fan-out-shots
mode: spawner
spawn:
  min_children: 1
  max_children: 50
  apply: auto
```

Body: read upstream catalog, call `ctx.loop.spawn(target, { params: { key: value } })` per entry.

Never write child TASK.md files directly — templates own those.

---

## converger

Multi-wave loop. Body re-runs each wave until halt fires.

```yaml
id: fix-all-type-errors
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

## gateway

Sync point. No body, no outputs. Downstream depends on one edge instead of N.

```yaml
id: staging-ready
mode: gateway
depends_on: [01-build, 02-test, 03-lint]
```
