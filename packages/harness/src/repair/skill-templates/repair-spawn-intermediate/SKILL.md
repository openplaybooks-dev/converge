---
name: repair-spawn-intermediate
description: Generate a new intermediate task when no existing task produces a required output
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
tags:
  - repair
  - gap:missing-intermediate
  - gap:blocker
context:
  - type: gap
    fields: [gapKind, taskId, taskTitle, inputPattern, missingOutputs, requiredByTask, epicId, suggestedUpstreamTask]
  - type: files
    pattern: ".harness/epics/*/tasks/*/SKILL.md"
    label: all-task-skills
    maxFiles: 30
  - type: ai
    prompt: >
      A task `{requiredByTask}` needs input files matching `{inputPattern}` but no existing task produces them.
      
      Search all SKILL.md files in .harness/epics/ to confirm no task has these in its outputs.
      Then determine:
      1. What kind of task should produce these files (e.g., generate HTML, compile data, screenshot)
      2. What inputs the new task would need
      3. Which epic it belongs to
      4. A reasonable task ID (zero-padded, e.g., 002-generate-screenshots)
      
      Return a concrete task definition plan in 5-10 lines.
    label: task-plan
    tools: [Read, Glob, Grep]
    timeoutMs: 45000
  - type: cmd
    cmd: "ls .harness/epics/{epicId}/tasks/ 2>/dev/null | tail -5"
    label: existing-tasks-in-epic
---

# Repair: Spawn Intermediate Task

No existing task produces the required output. Create a new task definition.

## Step 1: Read Context

1. Read `repair-context/gap.md` — what's missing and who needs it
2. Read `repair-context/task-plan.md` — AI plan for the new task
3. Read `repair-context/existing-tasks-in-epic.txt` — current tasks for numbering
4. Read `repair-context/all-task-skills.md` — all existing tasks for reference
5. Read `repair-context/history.md` (if exists) — DO NOT repeat failed approaches

## Step 2: Create the Task

Based on the AI task plan, create a new SKILL.md file:

1. Determine the task ID — use the next available number in the epic
2. Create the directory: `.harness/epics/{epicId}/tasks/{taskId}/`
3. Write SKILL.md with:
   - `name`: the task ID
   - `inputs`: what the task needs to read
   - `outputs`: the files that the blocked task needs (from the gap)
   - `checks`: `test -f` for each output
   - Body: clear instructions for what to generate

```yaml
---
name: {taskId}
description: Generate {missing files} for {downstream task}
inputs:
  - {source files}
outputs:
  - {the missing files from the gap}
checks:
  - id: output-exists
    cmd: "test -f {output}"
    description: "{output} exists"
allowed-tools:
  - Read
  - Write
  - Bash
---

# {Task Title}

Generate the missing files needed by {downstream task}.

## Instructions
{Based on AI task plan}
```

## Step 3: Verify

```bash
# Verify the SKILL.md is valid YAML
node -e "require('yaml').parse(require('fs').readFileSync('.harness/epics/{epicId}/tasks/{taskId}/SKILL.md','utf8').match(/^---\n([\s\S]*?)\n---/)[1])"
```

## Important

- The new task will be picked up by the orchestrator in the next iteration
- Do NOT try to execute the task yourself — just create the definition
- Ensure outputs match EXACTLY what the blocked task needs as inputs
