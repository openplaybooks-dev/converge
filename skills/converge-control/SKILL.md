---
name: converge-control
description: Use when running converge tasks, debugging task failures, planning new epics, or encountering "no tasks to run" errors in a converge-controlled project
---

# Converge Control

## Overview

Gap-filling orchestrator with progressive disclosure. Detect gap, route to playbook, execute, verify, repeat.

**Protocol:** `converge status` → identify gap → load ONE playbook → execute → verify → return here.

## Gap Detection Matrix

| Symptom | Detection | Route To |
|---------|-----------|----------|
| No `.converge/` directory | `ls .converge/` fails | `playbooks/setup.md` |
| Task shows ❌ | `converge status` | `playbooks/debug.md` — **read LEARN.md first** |
| Task shows ⏸️ | `converge tree` | Fix upstream blocker |
| "no tasks to run" | `converge status` | Routes to other gaps |
| Missing input files | `grep outputs .converge/epics/*/tasks/*/TASK.md` | Find + run producer |
| Circular dependency | `converge verify` shows error | `playbooks/plan.md` — break cycle |
| Fresh project / full plan needed | No `.converge/plan.md`, new project | **`converge-planning` skill** |
| Need new epic/tasks | User request, plan exists | **`converge-planning` skill** |
| Need CLI syntax | Unknown command | `preferences/cli-reference.md` |
| Need to read TASK.md | Understanding a task definition | `preferences/task-api.md` |
| Need WBS script | Writing wbs.js to spawn child tasks | `preferences/wbs-reference.md` |
| Need project config | Editing PROJECT.md | **`converge-planning` skill** |
| Need real example | Concept clear, need pattern | `examples/*.md` |
| Need comprehensive planning | Analyze project + discover needs + architect plan | **`converge-planning` skill** |

## Red Flags — STOP and Re-route

- **Debugging without reading LEARN.md first** — LEARN.md contains your own prior analysis. Read it.
- **Loading multiple playbooks at once** — Load ONE file per gap. Return here between.
- **Retrying a task without understanding the failure** — Read attempt logs before retrying.
- **Editing the wrong task** — Trace which task *produces* the missing file, don't fix the consumer.
- **Running `converge run` when `converge status` shows blockers** — Fix blockers first.

| Excuse | Reality |
|--------|---------|
| "I'll just retry, it might work" | Same input = same output. Read logs first. |
| "I need to read all the playbooks to understand" | You need ONE playbook for the current gap. |
| "The task definition looks fine" | Check the actual output vs expected — definitions lie. |
| "I'll fix it later and move on" | Downstream tasks depend on this. Fix now. |

## Quick Reference

```bash
converge status              # Current state (✅❌⏸️⬜)
converge tree                # Dependency visualization
converge run --step          # Execute one task
converge run                 # Autonomous loop
converge run --force         # Bypass blocked/completed state
converge reset {taskId}      # Reset failed task
converge verify              # Verify config, structure, deps, format
converge inspect --last-session  # Debug last execution
converge journal             # Execution history
converge gantt               # Timeline view
converge cleanup             # Remove orphaned journals
converge skills list         # Available skills
```

## Critical Files

```
.converge/PROJECT.md                                                ← Project config (YAML frontmatter)
.converge/journal/epics/{epic}/tasks/{task}/attempts/wip/LEARN.md  ← Read BEFORE debugging
.converge/journal/.checkpoint.json                                  ← State truth
.converge/epics/{epic}/tasks/{task}/TASK.md                          ← Task definition
.converge/epics/{epic}/tasks/{task}/SKILL.md                        ← Agent instructions
```

## Layer Map

```
Layer 0: SKILL.md (this file) — navigation hub
Layer 1: playbooks/  — action guides (setup, debug, plan, run)
Layer 2: preferences/ — API reference (cli-reference, task-api, wbs-reference, skill-api)
Layer 3: examples/  — real patterns (screen-generation, data-modeling, dependency-chain)
```

**Load minimum. Return here. Repeat.**
