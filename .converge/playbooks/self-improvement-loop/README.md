# self-improvement-loop

Continuously improves the converge framework. Each loop cycle spawns an epoch that runs a 3-stage pipeline with a verify→implement while loop. The loop repeats to find and fix the next issue.

## Usage

```sh
converge run --playbook=self-improvement-loop
```

## Epoch pipeline

Each epoch runs 3 stages:

```
analyze → implement → verify
              ↑          │
              └──────────┘
            (on-fail reset)
```

| Stage | Task | Description |
|---|---|---|
| 1 | `001-analyze` | Scan codebase (types, structure, API, tests), score 6 quality dimensions, pick the single best improvement |
| 2 | `002-implement` | Read the analysis, apply the fix (single focused change) |
| 3 | `003-verify` | Typecheck + test gate. On failure, resets implement for retry (the while loop). Appends result to shared journal. |

## The while loop

verify has `on-fail.reset: ["002-implement"]`. If typecheck or tests fail:
1. verify fails → implement is reset
2. implement re-runs with the failure output as feedback
3. verify checks again
4. Repeats until verify passes

This replaces the separate review stage — a mechanical gate instead of LLM judgment.

## Shared journal

Each epoch's verify stage appends to `.converge/artifacts/self-improvement-loop/journal.md` — a running markdown log with scores, target, result, and files changed. This is the memory of the loop.

- **Analyze** reads the journal to understand what's been tried and avoid repeating fixes
- **Root convergence** scans the journal to detect refactor signals (same file patched 3+ times, same dimension stuck low, fix categories repeating)
- When 2+ signals fire, convergence recommends a larger refactor — giving the next epoch evidence to take on a bigger change autonomously

## Directory structure

```
self-improvement-loop/
  TASK.md              # root seed parent (spawns epochs)
  playbook.yml         # loop mode config
  PLAN.md              # root delegation blueprint
  README.md
  seeds/
    epoch.seed.js      # root seed — finds next epoch number, spawns it
    epoch/
      templates/
        epoch/
          TASK.md      # epoch template ({{taskId}}, {{epoch}} vars)
          PLAN.md      # epoch delegation blueprint
          seeds/
            epoch-seed.seed.js  # epoch seed — spawns 3 stages
          tasks/
            analyze/TASK.md     # pick issue, write plan
            implement/TASK.md   # apply the fix
            verify/TASK.md      # typecheck + test gate + record
  tasks/                # runtime — spawned epochs appear here
    epoch-001/
    epoch-002/
    ...
  tests/
    typecheck/index.test.md
    tests-pass/index.test.md
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

1. The loop runner starts a cycle by calling the converge runner
2. The converge runner discovers `TASK.md` at the playbook root — a seed parent
3. `seeds/epoch.seed.js` runs, scans `tasks/` for existing `epoch-NNN` folders, spawns the next one from the epoch template
4. The epoch seed spawns 3 stages (analyze → implement → verify)
5. verify gates implement: if typecheck or tests fail, implement is reset and retried. On pass, verify appends to the shared journal.
6. Once all 3 stages complete, the epoch converge step cross-validates outputs and confirms the journal entry
7. The root converge step reads the full journal, detects refactor signals, and writes a convergence recommendation
8. The loop runner starts the next cycle, which spawns the next epoch
