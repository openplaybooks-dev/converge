---
name: repair-check-failed
description: Fix failing validation checks by reading error output and making targeted code fixes
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
tags:
  - repair
  - gap:check-failed
context:
  - type: gap
    fields:
      [checkId, checkCmd, checkOutput, checkDescription, taskTitle, unitPath]
  - type: cmd
    cmd: "{checkCmd}"
    label: fresh-check-output
  - type: file
    path: "{attemptDir}/TASK.md"
    label: task-definition
  - type: file
    path: "{attemptDir}/CHECK.md"
    label: all-checks
  - type: file
    path: "{attemptDir}/LEARN.md"
    label: previous-learnings
    optional: true
  - type: file
    path: "{attemptDir}/FEEDBACK.md"
    label: prior-feedback
    optional: true
  - type: ai
    prompt: >
      A validation check failed. Analyze the root cause.

      Check command: `{checkCmd}`
      Error output: {checkOutput}

      Read the task definition at {attemptDir}/TASK.md for context.
      In 3-5 sentences: what is the root cause and what specific file/line needs to change?
    label: root-cause-analysis
    tools: [Read, Glob, Grep]
    timeoutMs: 30000
---

# Repair Check Failed

You are fixing a task whose validation check(s) failed.

## Step 1: Read Context

1. Read `repair-context/gap.md` — the exact error
2. Read `repair-context/root-cause-analysis.md` — AI pre-analysis of the root cause
3. Read `repair-context/fresh-check-output.txt` — LIVE output from re-running the check
4. Read `repair-context/history.md` (if exists) — what was already tried

## Step 2: Diagnose

Compare the fresh check output with the expected behavior in `repair-context/all-checks.md`.

| Error Pattern           | Fix                                                |
| ----------------------- | -------------------------------------------------- |
| `file not found`        | Wrong output path — check TASK.md for correct path |
| `expected X got Y`      | Content mismatch — fix the content                 |
| `syntax error`          | Generated code has a bug — fix it                  |
| `module not found`      | Missing import/dependency                          |
| `exit code 1` no output | Check command needs different args                 |

## Step 3: Fix

1. Read `repair-context/task-definition.md` for full task context
2. Make targeted edits — change ONLY what's needed
3. Do NOT rewrite entire files unless necessary

## Step 4: Verify

Run the failing check:

```bash
# The exact check command from the gap
```

Then run ALL checks in CHECK.md to ensure nothing else broke.

## Rules

- Do NOT modify the check command to make it pass
- Do NOT add `|| true` to bypass failures
- If the check itself is wrong, write LEARN.md explaining why and stop
