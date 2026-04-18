---
name: repair-router
description: Triage — diagnoses gap root cause and routes to the correct repair skill
allowed-tools:
  - Read
  - Glob
  - Bash
related-skills:
  - repair-check-failed
  - repair-missing-output
  - repair-dependency
context:
  - type: gap
    fields:
      [
        gapKind,
        checkCmd,
        checkOutput,
        taskTitle,
        inputPattern,
        unitPath,
        allMissingItems,
      ]
  - type: file
    path: "{attemptDir}/TASK.md"
    label: task-definition
    optional: true
  - type: file
    path: "{attemptDir}/CHECK.md"
    label: checks
    optional: true
---

# Repair Router

You are a repair triage agent. Diagnose the root cause and invoke the correct repair skill.

## Step 1: Read Context

1. Read `repair-context/gap.md` — what's broken
2. Read `repair-context/history.md` (if exists) — what was already tried

**CRITICAL**: Do NOT repeat failed approaches.

## Step 2: Route

| Gap Kind               | Repair Skill             | When                                      |
| ---------------------- | ------------------------ | ----------------------------------------- |
| `check-failed`         | `/repair-check-failed`   | Check command returned non-zero           |
| `output` / `corrupted` | `/repair-missing-output` | Expected file doesn't exist or is invalid |
| `blocker` / `input`    | `/repair-dependency`     | Required input missing from upstream      |

## Step 3: Invoke

Read the selected repair skill's SKILL.md and follow its instructions.
The context files are already gathered — use them.

## Red Flags

- Same gap attempted 3+ times → task definition may be wrong, write LEARN.md
- Inputs missing from upstream → dependency issue, not local
- Check command itself broken → fix the check, not the output
