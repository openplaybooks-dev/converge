---
name: harness-control
description: Use when running harness tasks, debugging task failures, planning new epics, or encountering "no tasks to run" errors in a harness-controlled project
---

# Harness Control

## Overview

Gap-filling orchestrator with progressive disclosure. Detect gap, route to playbook, execute, verify, repeat.

**Protocol:** `harness status` → identify gap → load ONE playbook → execute → verify → return here.

## Gap Detection Matrix

| Symptom | Detection | Route To |
|---------|-----------|----------|
| No `.harness/` directory | `ls .harness/` fails | `playbooks/setup.md` |
| Task shows ❌ | `harness status` | `playbooks/debug.md` — **read LEARN.md first** |
| Task shows ⏸️ | `harness tree` | Fix upstream blocker |
| "no tasks to run" | `harness status` | Routes to other gaps |
| Missing input files | `grep outputs .harness/epics/*/tasks/*/TASK.md` | Find + run producer |
| Circular dependency | `harness verify` shows error | `playbooks/plan.md` — break cycle |
| Fresh project / full plan needed | No `.harness/plan.md`, new project | **`harness-planning` skill** |
| Need new epic/tasks | User request, plan exists | **`harness-planning` skill** |
| Need CLI syntax | Unknown command | `preferences/cli-reference.md` |
| Need to read TASK.md | Understanding a task definition | `preferences/task-api.md` |
| Need WBS script | Writing wbs.js to spawn child tasks | `preferences/wbs-reference.md` |
| Need project config | Editing PROJECT.md | **`harness-planning` skill** |
| Need real example | Concept clear, need pattern | `examples/*.md` |
| Need comprehensive planning | Analyze project + discover needs + architect plan | **`harness-planning` skill** |

## Red Flags — STOP and Re-route

- **Debugging without reading LEARN.md first** — LEARN.md contains your own prior analysis. Read it.
- **Loading multiple playbooks at once** — Load ONE file per gap. Return here between.
- **Retrying a task without understanding the failure** — Read attempt logs before retrying.
- **Editing the wrong task** — Trace which task *produces* the missing file, don't fix the consumer.
- **Running `harness run` when `harness status` shows blockers** — Fix blockers first.

| Excuse | Reality |
|--------|---------|
| "I'll just retry, it might work" | Same input = same output. Read logs first. |
| "I need to read all the playbooks to understand" | You need ONE playbook for the current gap. |
| "The task definition looks fine" | Check the actual output vs expected — definitions lie. |
| "I'll fix it later and move on" | Downstream tasks depend on this. Fix now. |

## Quick Reference

```bash
harness status              # Current state (✅❌⏸️⬜)
harness tree                # Dependency visualization
harness run --step          # Execute one task
harness run                 # Autonomous loop
harness run --force         # Bypass blocked/completed state
harness reset {taskId}      # Reset failed task
harness verify              # Verify config, structure, deps, format
harness inspect --last-session  # Debug last execution
harness journal             # Execution history
harness gantt               # Timeline view
harness cleanup             # Remove orphaned journals
harness skills list         # Available skills
```

## Critical Files

```
.harness/PROJECT.md                                                ← Project config (YAML frontmatter)
.harness/journal/epics/{epic}/tasks/{task}/attempts/wip/LEARN.md  ← Read BEFORE debugging
.harness/journal/.checkpoint.json                                  ← State truth
.harness/epics/{epic}/tasks/{task}/TASK.md                          ← Task definition
.harness/epics/{epic}/tasks/{task}/SKILL.md                        ← Agent instructions
```

## Layer Map

```
Layer 0: SKILL.md (this file) — navigation hub
Layer 1: playbooks/  — action guides (setup, debug, plan, run)
Layer 2: preferences/ — API reference (cli-reference, task-api, wbs-reference, skill-api)
Layer 3: examples/  — real patterns (screen-generation, data-modeling, dependency-chain)
```

**Load minimum. Return here. Repeat.**
