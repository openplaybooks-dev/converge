---
name: repair-dependency
description: Resolve missing input dependencies by finding upstream producers
allowed-tools:
  - Read
  - Glob
  - Bash
  - Grep
tags:
  - repair
  - gap:blocker
  - gap:input
  - gap:missing-intermediate
context:
  - type: gap
    fields: [gapKind, inputPattern, taskTitle, taskId, suggestedUpstreamTask]
  - type: cmd
    cmd: "find .harness/epics -name 'SKILL.md' -exec grep -l 'outputs:' {} \\; 2>/dev/null | head -20"
    label: tasks-with-outputs
  - type: cmd
    cmd: "find . -maxdepth 4 -name '*.html' -o -name '*.json' -o -name '*.md' -o -name '*.png' 2>/dev/null | head -30"
    label: existing-files-sample
  - type: ai
    prompt: >
      A task needs the input file matching pattern `{inputPattern}` but it doesn't exist.
      
      Read these SKILL.md files to find which task should produce it:
      {attemptDir}/../../../tasks/*/SKILL.md
      
      For each task found, check its `outputs:` field. If a task's outputs match
      or could produce `{inputPattern}`, report:
      1. The task ID and its SKILL.md path
      2. Whether it has already run (check for checkpoint.json in its journal dir)
      3. If it ran, why it might have failed to produce the file
      
      If no task produces this file, say so clearly.
      Be concise — 5-10 lines max.
    label: producer-analysis
    tools: [Read, Glob, Grep]
    timeoutMs: 45000
  - type: file
    path: "{attemptDir}/NEEDS.result.md"
    label: needs-status
    optional: true
---

# Repair Dependency

A task is blocked because required input files are missing.

## Step 1: Read Context

1. Read `repair-context/gap.md` — which input is missing
2. Read `repair-context/producer-analysis.md` — AI analysis of which task should produce it
3. Read `repair-context/existing-files-sample.txt` — what files actually exist on disk
4. Read `repair-context/history.md` (if exists) — DO NOT repeat failed approaches

## Step 2: Act on AI Analysis

The `producer-analysis.md` file tells you which upstream task should produce the missing file.

| Finding | Action |
|---------|--------|
| Producer found, hasn't run | Write LEARN.md: "run {producer} first" |
| Producer found, ran but failed | Write LEARN.md: why it failed + what to fix |
| No producer found | Write LEARN.md: "no task produces {pattern} — need new task" |
| Files exist at different path | Fix the input glob pattern in the task's SKILL.md |

## Step 3: Check Pattern Mismatch

Compare `repair-context/existing-files-sample.txt` with the missing pattern.
If similar files exist at a slightly different path, that's a pattern mismatch — fix the glob.

## Step 4: Write LEARN.md

Document findings so the framework can take action.
