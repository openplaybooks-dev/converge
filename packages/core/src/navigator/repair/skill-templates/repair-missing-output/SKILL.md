---
name: repair-missing-output
description: Produce missing output files by reading the task definition and executing the required work
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
tags:
  - repair
  - gap:output
  - gap:corrupted
context:
  - type: gap
    fields: [gapKind, taskTitle, taskPrompt, allMissingItems, unitPath]
  - type: file
    path: "{attemptDir}/TASK.md"
    label: task-definition
  - type: file
    path: "{attemptDir}/NEEDS.result.md"
    label: available-inputs
  - type: file
    path: "{attemptDir}/CHECK.md"
    label: checks
    optional: true
  - type: file
    path: "{attemptDir}/LEARN.md"
    label: previous-learnings
    optional: true
---

# Repair Missing Output

A task's expected output file(s) don't exist or are corrupted.

## Step 1: Read Context

1. Read `repair-context/gap.md` — which files are missing
2. Read `repair-context/task-definition.md` — how to produce them
3. Read `repair-context/available-inputs.md` — what input files you have
4. Read `repair-context/history.md` (if exists) — DO NOT repeat failed approaches

## Step 2: Produce Outputs

Follow the task definition instructions to create the missing files.

**Key principles**:

- Write complete, production-quality content (no placeholders)
- Match the expected format (check extension: .json → valid JSON, .html → valid HTML)
- Write to the exact path from the gap

## Step 3: For Corrupted Files

If gap kind is `corrupted` — the file exists but failed validation:

- Read the file first
- Fix the specific issue (wrong magic bytes, invalid syntax, missing structure)
- Do NOT delete and recreate unless the file is beyond repair

## Step 4: Verify

1. Verify each output: `test -f {path} && test -s {path}`
2. If checks exist in `repair-context/checks.md`, run them ALL
