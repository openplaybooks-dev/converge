# Implementation Plan — Epoch 1

## Issue

- **Source:** dx
- **Area:** Documentation — troubleshooting and debugging guide
- **Description:** Add a troubleshooting guide that explains where to find execution logs, how to read FEEDBACK.md/LEARN.md from failed attempts, how to reset and re-run tasks, how to manually run check commands, and common failure patterns. This is a missing document that leaves human developers without guidance when they need to intervene in a failed run.

## Steps

### step-001
- **File:** `docs/troubleshooting.md`
- **Description:** Create the troubleshooting guide document
- **Details:** Create `docs/troubleshooting.md` with the following sections:
  1. **Finding Execution Logs** — Explain the `.converge/journal/` directory structure: `checkpoint.json` files for task status, `events.jsonl` for event streams, `convergence.json` for execution graph state, and `facts.jsonl` for collected facts. Explain that each task's logs live under `journal/{playbook}/tasks/{task-path}/`.
  2. **Reading FEEDBACK.md from Failed Attempts** — Explain that `FEEDBACK.md` is generated after check execution and shows which checks passed/failed with exact commands, exit codes, and output. Located at `attempts/{n}/FEEDBACK.md` or `attempts/wip/FEEDBACK.md` for the current attempt.
  3. **Reading LEARN.md for Self-Correction Context** — Explain that `LEARN.md` is generated when checks fail and carries failure analysis and corrections to the next attempt. It contains failed checks, passed checks, and specific corrections required. Only present on attempt 2+.
  4. **How to Reset and Re-run Tasks** — Document the `converge reset {taskId}` command. Explain that resetting archives the current `wip/` attempt and creates a fresh one, with LEARN.md propagated from the previous attempt.
  5. **How to Manually Run Check Commands** — Explain that CHECK.md lists all checks with shell commands. Each command should be run from the project root. Exit code 0 means pass, non-zero means fail. Reference the machine-readable format at `attempts/wip/data/check.json`.
  6. **Common Failure Patterns** — Cover: missing output files (task wrote to wrong path), broken check commands (typo or wrong path in TASK.md `cmd`), type errors or test failures blocking checks, max attempts exhausted without resolution.
  7. **Understanding Task Status** — Explain the attempt lifecycle: `attempts/wip/` is the active attempt, numbered directories (`01/`, `02/`) are archived attempts, and `checkpoint.json` tracks the current attempt number and status.
