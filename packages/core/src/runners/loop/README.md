# Loop Runner

The loop runner wraps the converge (evolve) runner in repeated cycles. Each cycle is a full converge run that discovers tasks, executes them, and checks for convergence.

## How it works

```
Loop Cycle 1 → evolveRun() → converged? → Cycle 2 → ...
                                stalled? → backoff → retry
```

1. Each cycle calls `evolveRun()` which runs autonomous task execution
2. If the cycle **converges** (all tasks pass, no failures), the next cycle starts immediately
3. If the cycle **stalls** (tasks fail), a backoff delay is applied before retrying
4. The loop stops when: max cycles reached, timeout exceeded, or stall limit hit

## Configuration

Set via `playbook.yml`:

```yaml
run:
  mode: loop
  maxIterations: 50      # max cycles
  maxTaskAttempts: 3     # retries per task within a cycle
  maxDuration: 4h        # wall-clock timeout
  resume: true           # resume from last checkpoint
  stall:
    maxConsecutive: 3    # stop after N consecutive stalled cycles
    backoffMs: 60000     # delay between stalled cycles (ms)
```

### Config reference

| Field | Default | Description |
|---|---|---|
| `maxIterations` | `Infinity` | Maximum number of loop cycles |
| `maxTaskAttempts` | `2` | Max retries per task before marking failed |
| `maxDuration` | none | Wall-clock timeout (e.g., `4h`, `30m`) |
| `resume` | `false` | Resume from last checkpoint instead of starting fresh |
| `stall.maxConsecutive` | `0` (no limit) | Stop after N consecutive stalled cycles |
| `stall.backoffMs` | `30000` | Delay in ms between stalled cycles |

## Loop vs Converge vs Dispatch

| Mode | Use case | Behavior |
|---|---|---|
| `loop` | Continuous improvement | Runs converge cycles indefinitely until max cycles or timeout |
| `converge` | One-shot convergence | Runs epochs until all tasks pass or stall limit hit |
| `dispatch` | Single dynamic-spawn pass | Runs root dynamic parent once, executes spawned children, exits |

## Architecture

```
loopRun()
  └── evolveRun()         # one cycle
        └── autonomousRun()  # one epoch
              └── tree.findNextTask() → execute → tree.reload()
```

- **Loop** owns the cycle count, stall detection, and backoff
- **Evolve** owns epoch progression and task reset between epochs
- **Autonomous** owns tree traversal and individual task execution

## Dynamic spawn and root TASK.md

A loop playbook typically has a root `TASK.md` with `seed: { mode: cli }`
that emits `converge spawn ...` commands for epochs dynamically. Templates
for spawned children can live anywhere in the playbook; a common pattern is a
`templates/` directory next to the root task.

```
playbook/
  TASK.md          # root task with seed: frontmatter
  playbook.yml     # mode: loop config
  templates/
    epoch/
      TASK.md
      tasks/
        analyze/TASK.md
        implement/TASK.md
        ...
  tasks/           # runtime — spawned epochs appear here
    epoch-001/
    epoch-002/
```

Each cycle, the root dynamic parent checks for existing epochs and emits the
next `converge spawn ...` command. The autonomous runner then executes the
epoch's task pipeline.
