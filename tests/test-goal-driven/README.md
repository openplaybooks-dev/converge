# test-goal-driven — multi-wave do-while + seeding

A minimal test fixture combining the two patterns demonstrated by
`tests/test-waves` and `tests/test-seeding`. Models the same shape as
`examples/goal-driven-dev` but in ~120 lines of YAML/shell and zero
LLM calls.

## Topology

```
build (multi-wave do-while, 3 iterations)
  ├── wave 0 → spawns sprint-0
  │             ├── sprint-0--phase-a
  │             └── sprint-0--phase-b
  ├── wave 1 → spawns sprint-1
  │             ├── sprint-1--phase-a
  │             └── sprint-1--phase-b
  └── wave 2 → spawns sprint-2
                ├── sprint-2--phase-a
                └── sprint-2--phase-b
```

Total per run: **1 build + 3 sprints + 6 phases = 10 tasks**.

## How the loop is driven

`build` is a passthrough task with a check that only passes once wave
2 has been recorded:

```yaml
checks:
  - id: completed-3-waves
    cmd: test -f output/build/wave-2.flag
```

The framework's gap-driven repair loop sees the `check-failed` gap
after each body run and re-fires the body until the check passes.
Each body run:

1. Reads `output/build/wave.counter` (defaults to 0)
2. Writes `output/build/wave-${WAVE}.flag`
3. Spawns `sprint-${WAVE}` via `converge spawn task <id> <template>`
4. Bumps the counter

The `converge:` prompt fires between body runs; the stub provider
returns `{"action":"continue"}` so the framework's per-task wave
counter increments in `tasks.jsonl metadata.wave`.

On wave 2, the body marks itself done via `converge tasks mark` so
the converge: prompt short-circuits to the early-halt path on its
next pass.

## Seeding chain (per wave)

Each `sprint-N` spawned by `build` is a passthrough orchestrator that:

1. Writes `output/sprints/sprint-N.flag` recording its context
2. Spawns 2 phase children via `converge spawn task`
3. Marks an idempotency flag so re-attempts don't duplicate-spawn

Each phase child is a leaf that writes
`output/phases/sprint-N--phase-{a,b}.json` recording its three
declared vars (`wave`, `sprint_id`, `phase`).

The framework's `syncSpawnedToDag` callback picks up newly-registered
rows from `tasks.jsonl` after each body exit, injecting children into
the running DAG immediately. No outer-loop driver needed.

## Idempotent spawning

Both `build` and the sprint template guard their `converge spawn`
calls with on-disk markers:

```bash
MARKER="output/spawn-markers/build-sprint-${WAVE}.done"
if [ ! -f "$MARKER" ]; then
  converge spawn "sprint-${WAVE}" sprint --var ...
  touch "$MARKER"
fi
```

This is essential because the framework's gap-repair loop re-runs the
parent body when its check still fails. Without the marker, the second
body call would hit `duplicate task id` from the ledger.

## What's tested

`run-test.sh` runs the fixture and asserts **28 invariants**:

- **Playbook validates** (1)
- **build wave flags** — `output/build/wave-{0,1,2}.flag` (3)
- **sprint flags** — `output/sprints/sprint-{0,1,2}.flag` with correct
  wave + sprint_id context (6)
- **phase artifacts** — 6 JSON files with correct `wave`, `sprint_id`,
  `phase` vars (13)
- **ledger rows** — 1 build + 3 sprints + 6 phases, build marked done
  (4)
- **framework clean completion** — 0 failed tasks (1)

All run without an LLM via `ai.provider: stub` and
`CONVERGE_STUB_RESPONSE='{"action":"continue"}'`.

## Run it

```bash
bash run-test.sh
```

Expected:

```
RESULTS:  28 passed,  0 failed
```

## Files

```
.converge/
  project.yaml
  playbooks/default/
    playbook.yml
    tasks/build/TASK.md                     # multi-wave root
    templates/
      sprint/TASK.md                        # per-wave orchestrator
      phase/TASK.md                         # leaf
run-test.sh
README.md
```

## Relationship to other fixtures

- `tests/test-waves` — same wave loop pattern, no seeding (single task)
- `tests/test-seeding` — same CLI seeding pattern, no waves (single
  invocation, fan-out)
- `examples/goal-driven-dev` — full production shape: 6 phases per
  sprint, dossier/journal/checklist, MiniMax LLM, outer sprint-loop.sh
