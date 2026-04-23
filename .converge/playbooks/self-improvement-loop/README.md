# self-improvement-loop

Continuously improves the converge framework. Each loop cycle spawns an epoch that runs a 5-stage pipeline, then the loop repeats to find and fix the next issue.

## Usage

```sh
converge run --playbook=self-improvement-loop
```

## Epoch pipeline

Each epoch runs these stages sequentially:

| Stage | Task | Description |
|---|---|---|
| 1 | `001-analyze` | Scan codebase (types, structure, API, tests), prioritize best issue |
| 2 | `002-implement` | Plan fix, split into todos, execute each |
| 3 | `003-review` | Code review the changes (rejects loop back to implement) |
| 4 | `004-quality` | Typecheck + test gate |
| 5 | `005-changelog` | Summarize what changed |

The `002-implement` stage is itself a WBS that spawns sub-tasks:
- `001-plan` — read analysis, write implementation plan
- `002-todos` — split plan into individual todo tasks (another WBS)
- `003-verify` — final typecheck + test gate

## Directory structure

```
self-improvement-loop/
  TASK.md              # root WBS task (spawns epochs)
  playbook.yml         # loop mode config
  README.md
  wbs/
    wbs.js             # root WBS script — finds next epoch number, spawns it
    templates/
      epoch/
        TASK.md        # epoch template ({{taskId}}, {{epoch}} vars)
        wbs/wbs.js     # epoch pipeline spawner (5 stages)
        tasks/
          analyze/TASK.md
          implement/
            TASK.md
            wbs/wbs.js          # spawns plan, todos, verify
            tasks/
              plan/TASK.md
              todos/
                TASK.md
                wbs/wbs.js      # reads plan.md, spawns one task per step
              verify/TASK.md
          review/TASK.md
          quality/TASK.md
          changelog/TASK.md
  tasks/                # runtime — spawned epochs appear here
    epoch-001/
    epoch-002/
    ...
```

## Configuration

From `playbook.yml`:

```yaml
run:
  mode: loop
  maxIterations: 50       # max loop cycles
  maxTaskAttempts: 3      # retries per task before marking failed
  maxDuration: 4h         # wall-clock timeout
  resume: true            # resume from last checkpoint
  stall:
    maxConsecutive: 3     # stop after 3 consecutive stalled cycles
    backoffMs: 60000      # 60s delay between stalled cycles
```

## How it works

1. The loop runner starts a cycle by calling the converge (evolve) runner
2. The converge runner discovers `TASK.md` at the playbook root — a WBS parent
3. `wbs/wbs.js` runs, scans `tasks/` for existing `epoch-NNN` folders, spawns the next one from the epoch template
4. The autonomous runner picks up the new epoch's children and executes the pipeline
5. Once all 5 stages complete, the epoch is done. The converge run reports convergence
6. The loop runner starts the next cycle, which spawns the next epoch
