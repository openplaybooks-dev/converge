# Goal-Driven / Iteration — Worked Example

## When to use this scenario

**Trigger phrases:**
- "goal-driven" / "do-while loop"
- "sprint planning" / "kanban board"
- "complete a checklist"
- "iterate until goals are done"
- "wave-based work items"

**What it covers:** `(do-while: wave → sprint → work items) × N`. Static checklist, arbitrary work per wave, halts when all items checked off.

---

`(do-while: wave → sprint → work items) × N → halt when goals done`. Used when the goal set is static (a checklist, sprint backlog, kanban board) and you iterate until everything is checked off.

## The thinking sequence applied

1. **What does it contain?** A static checklist of items to complete
2. **Composition?** Do-while: root iterates waves, each wave does work on items
3. **Static vs. dynamic?** Goals are static (known upfront). Work per wave is arbitrary.
4. **Modes?** Root: `mode: loop`. Sprint: `passthrough` spawner.

---

## The goal-driven loop

```
root task (do-while)
  └─▶ wave-0
        └─▶ sprint
              └─▶ phase-item-001
              └─▶ phase-item-002
              └─▶ phase-item-N
  └─▶ wave-1
        └─▶ sprint
              └─▶ phase-item-001  (already done — idempotent skip)
              └─▶ phase-item-003  (new work)
  └─▶ wave-N
        └─▶ sprint
  └─▶ halt when all-done.marker exists
```

**Core pattern:**
1. **Static goal set** — a checklist of items to do (sprint backlog, kanban board, audit checklist)
2. **Do-while loop** — root task iterates waves until all goals are done
3. **Arbitrary work per wave** — sprint, kanban, kaizen, audit, research — anything that completes items
4. **Halt when goals pass** — `all-done.marker` is the only convergence signal

---

## playbook.yml

**No `tasks:` entry.** Single root task drives the loop. Everything else spawned at runtime.

```yaml
name: goal-driven
description: >-
  Do-while loop: run waves until all goals are checked off.
  Each wave does arbitrary work (sprint, kanban, kaizen, audit...).
  Halts when goals: checks pass.

run:
  mode: loop
  maxIterations: 30
  resume: true
```

---

## tasks/ structure

```
tasks/
└── build/
    └── TASK.md                    ← do-while root (single static task)
```

---

## templates/ structure

```
templates/
├── sprint/                        ← per-wave orchestrator
│   └── TASK.md
└── phase/                         ← per work-item task
    └── TASK.md
```

---

## Phase details

### Root task (do-while)

```yaml
tasks/build/TASK.md:
  ---
  id: build
  title: Goal-driven do-while root
  passthrough: true
  checks:
    - id: goals-done
      cmd: test -f output/goals/all-done.marker
  converge: |
    If output/goals/all-done.marker exists, halt.
    Else, continue to next wave.
  ---
  # Body: reads wave.counter, does one wave of work, bumps counter
  WAVE=$(cat output/wave.counter 2>/dev/null || echo 0)
  mkdir -p output/build
  echo "wave=$WAVE ran at=$(date +%s)" > output/build/wave-${WAVE}.flag

  # Spawn sprint for this wave
  converge spawn "sprint-${WAVE}" sprint --var wave="$WAVE"

  # Bump counter
  NEXT=$((WAVE + 1))
  echo "$NEXT" > output/build/wave.counter

  # Mark done if all goals complete
  if [ -f output/goals/all-done.marker ]; then
    converge tasks mark build --status done \
      --reasoning "all goals checked off"
  fi
```

### Sprint orchestrator (per wave)

```yaml
templates/sprint/TASK.md:
  ---
  id: sprint-template
  title: Sprint orchestrator
  passthrough: true
  vars:
    - wave
  ---
  # Spawns phase children for this wave.
  # Reads from kanban/sprint board, spawns one phase per in-progress item.

  for item in $(jq -r '.in_progress[]' output/goals/kanban.json 2>/dev/null); do
    converge spawn "sprint-${WAVE}-${item}" phase \
      --var wave="$WAVE" \
      --var item="$item"
  done
```

### Phase (per work item)

```yaml
templates/phase/TASK.md:
  ---
  id: phase-template
  title: Work item
  passthrough: true
  vars:
    - wave
    - item
  ---
  # Does the actual work: fix bug, write docs, audit code, etc.
  # Writes done marker when complete.

  mkdir -p "output/goals/items/${ITEM}/"
  # ... work ...
  touch "output/goals/items/${ITEM}/done.marker"

  # Check if all items are done → write all-done.marker
  DONE_COUNT=$(ls output/goals/items/*/done.marker 2>/dev/null | wc -l)
  TOTAL=$(jq '.total' output/goals/kanban.json)
  if [ "$DONE_COUNT" -ge "$TOTAL" ]; then
    touch output/goals/all-done.marker
  fi
```

---

## Goals file — the static checklist

The checklist is a file, not in the playbook:

```json
// output/goals/kanban.json
{
  "in_progress": ["item-002", "item-003"],
  "done": ["item-001"],
  "total": 3
}
```

Each phase marks its item done by writing `output/goals/items/item-001/done.marker`.

---

## Convergence: when ALL goals are checked off

The root task's `goals:` check gates loop continuation:

```yaml
checks:
  - id: goals-done
    cmd: test -f output/goals/all-done.marker
```

When this passes, the loop halts.

---

## Examples from real code

### test-goal-driven

Build task iterates 3 waves. Each wave spawns a sprint which spawns 2 phases. Total: 1 build + 3 sprints + 6 phases = 10 tasks.

### goal-driven-dev

Sprint loop: research → ideate → prototype → build → verify → retro → [next sprint]. Halts when `checklist-fully-ticked` passes.

---

## Key insight: static goals vs. dynamic optimization

**Goal-driven:** static checklist to complete. Loop runs until ALL items are done. Kanban, sprint planning, kaizen, audit — any work where the goal set is known upfront.

**Optimization:** candidates scored and ranked. Next generation driven by scores. Halts when score threshold met or plateau.

| | Goal-driven | Optimization |
|---|---|---|
| Currency | Checklist items | Candidates |
| Driver | Work completes items | Score selects next generation |
| Convergence | all-done.marker | halt.marker (threshold) |
| Loop type | Do-while | Generate → score → select |

Both use `mode: loop` + `resume: true`. Both use `wave.counter` or epoch files as the iteration counter.

---

## Structural summary

| Element | Pattern |
|---|---|
| Root task | `mode: loop`, reads `wave.counter`, spawns sprint per wave |
| Sprint | `passthrough`, spawns phase children per work item |
| Phase | `passthrough`, does work, marks item done |
| Convergence | `all-done.marker` when all checklist items complete |
| Resume | `wave.counter` persisted, picks up at next wave |
| Idempotent spawn | Phase checks `done.marker` before doing work — re-runs skip completed items |
