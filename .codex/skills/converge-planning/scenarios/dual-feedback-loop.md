# Dual Feedback Loop — Worked Example

## When to use this scenario

**Trigger phrases:**
- "two playbooks feeding each other" / "dual loop"
- "generator-evaluator loop"
- "evolve candidates in parallel"
- "incremental improvement across epochs"
- "tournament selection loop"

**What it covers:** Two `mode: loop` playbooks with cross-inputs wiring. A ↔ B incremental feedback across epochs.

---

Two playbooks in a continuous feedback loop, each one's outputs incrementally feeding the other's inputs across epochs. The most advanced Converge pattern.

## The thinking sequence applied

1. **What does it contain?** Two loops — generator and evaluator, each in `mode: loop`
2. **Composition?** Cross-playbook: A reads B's epoch output → B reads A's epoch output
3. **Static vs. dynamic?** Both are loops — each epoch is dynamic, the epoch count is the iteration
4. **Modes?** Both `mode: loop` with `resume: true` — each epoch is a checkpoint

---

## The dual-incremental feedback loop

```
playbook A (generator)              playbook B (evaluator/improver)
     │                                    │
     │ reads: output/B/epoch-<N>/         │
     │◀──────────────────────────────────│
     │                                    │
     │ writes: output/A/epoch-<N+1>/      │
     │──────────────────────────────────▶│
     │ reads: output/B/epoch-<N>/         │
     │◀──────────────────────────────────│
     │   ... loop continues ...           │
```

**Applied to evolutionary optimization:**
- Playbook A (generator): generate candidate variations
- Playbook B (evaluator): evaluate candidates, select winners, crossover

**Applied to goal-driven sprint:**
- Playbook A (planner): research + ideate
- Playbook B (builder): build + verify + retro

**Applied to research:**
- Playbook A (explorer): generate hypotheses / research directions
- Playbook B (synthesizer): fetch evidence, score quality, cross-reference

---

## playbook.yml for both

**No `tasks:` entry.** Each playbook discovers its own tasks from its `tasks/` directory.

### Playbook A — generator loop

```yaml
name: generator
description: >-
  Generate candidate improvements across epochs.
  Each epoch: reads previous output from evaluator → generates next generation.
  Halts when evaluator signals convergence (halt.marker written).

run:
  mode: loop
  maxIterations: 30
  resume: true
  stall:
    maxConsecutiveStop: 5
    backoffMs: 30000
```

### Playbook B — evaluator loop

```yaml
name: evaluator
description: >-
  Evaluate and select candidate improvements across epochs.
  Each epoch: reads from generator's output → evaluates → selects best → crossover.
  Writes halt.marker when quality threshold is met.

run:
  mode: loop
  maxIterations: 30
  resume: true
```

---

## Cross-playbook inputs/outputs

The loop is closed by file paths — no `depends_on:` between playbooks.

| Playbook | Reads from | Writes to |
|---|---|---|
| Generator (A) | `output/evaluator/epoch-<N>/` | `output/generator/epoch-<N+1>/` |
| Evaluator (B) | `output/generator/epoch-<N>/` | `output/evaluator/epoch-<N+1>/` |

**Ordering:** The runtime resolves cross-playbook ordering at the epoch level because each epoch's output path is declared as an `input:` in the task that needs it.

**Example epoch paths:**
```
output/generator/epoch-001/candidates.json
output/evaluator/epoch-001/scored.json
output/generator/epoch-002/candidates.json  ← A reads evaluator's epoch-001 output
output/evaluator/epoch-002/scored.json     ← B reads generator's epoch-002 output
...
```

---

## Convergence mechanism

**Shared halt signal.** Playbook B evaluates quality each epoch. When the quality threshold is met (e.g., `fitness_score >= 0.9`), B writes `halt.marker` to signal both loops to stop:

```yaml
# evaluator's TASK.md body each wave:
if [ "$(cat output/evaluator/epoch-$N/fitness.json | jq '.score')" -ge 90 ]; then
  echo "convergence reached"
  touch output/halt.marker
fi
```

Both playbooks check for `halt.marker` via their `goals:` — when the file exists, both loops halt.

---

## Key insight: dual loops, not producer-consumer pipeline

**NOT a pipeline** (A → B → done). **A dual loop** (A ↔ B, each epoch feeds the next).

The difference:
- Pipeline: A finishes → B starts → done (one-directional)
- Dual loop: A and B both loop, each writing outputs the other reads, epoch by epoch (bidirectional, incremental)

Both playbooks use `mode: loop` + `resume: true`. Each epoch is a checkpoint. If either playbook crashes mid-epoch, `resume` picks up at the next epoch boundary.

**Stall detection** prevents infinite loops: if neither playbook makes progress for N consecutive epochs (checked via `stall.maxConsecutive`), both halt with a warning.

---

## Structural summary

| Element | Pattern |
|---|---|
| Both playbooks | `mode: loop`, `resume: true` |
| Cross-playbook wiring | `inputs:` paths pointing to other's `output/` |
| Convergence signal | Shared `halt.marker` file written by B when quality threshold met |
| Stall protection | `stall.maxConsecutiveStop: 5` on both |
| No depends_on between playbooks | Ordering via `inputs:` paths |
