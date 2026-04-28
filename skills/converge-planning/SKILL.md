---
name: converge-planning
description: Use when starting a fresh project, onboarding an existing codebase, or creating a comprehensive project plan with tasks, WBS, facts, checks, and skills
---

# Converge Planning

## Overview

Structured project planning for fresh or existing projects. Analyze codebase, discover user needs, architect the plan, validate before execution.

**Protocol:** Analyze → Discover → Architect → Validate → Hand off to `converge-control` for execution.

## Phase Detection Matrix

| Situation | Detection | Route To |
|-----------|-----------|----------|
| Fresh project, no code | Empty or scaffold-only directory | `guides/discovery.md` (skip analyze) |
| Existing codebase, no `.converge/` | Code exists but no converge | `guides/analyze.md` → then discovery |
| Existing codebase + converge, need new plan | `.converge/` exists, user wants replanning | `guides/analyze.md` → then architect |
| User described idea, need plan | User gave requirements | `guides/architect.md` |
| Plan exists, need validation | `playbook.yml` or tasks exist | `guides/validate.md` |
| Plan one node (per progressive-decomposition) | `converge plan <path> [-p "..."]` | `guides/progressive-decomposition.md` |
| Re-plan one node in place | `converge plan <path> --update` | `guides/progressive-decomposition.md` |
| Generate playbook from prompt (legacy) | `converge plan --prompt "..."` (new playbook) | `guides/plan-new-playbook.md` |
| Modify/extend existing playbook (legacy) | `converge plan --prompt "..." --update` | `guides/plan-existing-playbook.md` |
| Need artifact format reference | Creating plan manually | `preferences/plan-schema.md` |
| Need project template | Common project type | `preferences/project-patterns.md` |
| Need context principles reference | Designing context flow | `preferences/context-principles.md` |

## Playbook Generation Modes

When generating a playbook via `converge plan`, the AI auto-selects between two modes:

- **Standard** (scan + architect) — Prompt is specific and actionable. Skip discovery.
- **Deep** (all 4 phases) — Prompt is vague or exploratory. Run full analysis + discovery first.

See `guides/plan-new-playbook.md` for mode selection rules.

## Planning Phases

```
Phase 1: ANALYZE ──► Phase 2: DISCOVER ──► Phase 3: ARCHITECT ──► Phase 4: VALIDATE
 (codebase)           (user needs)          (create plan)          (verify plan)
                                                                        │
                                                                        ▼
                                                              Hand off to converge-control
```

### Phase 1 — Analyze (`guides/analyze.md`)
Scan the project: tech stack, file structure, existing work, dependencies, patterns.
**Output:** `.converge/analysis.md` — project snapshot.

### Phase 2 — Discover (`guides/discovery.md`)
Understand what the user wants: goals, constraints, priorities, non-functional requirements.
**Output:** `.converge/requirements.md` — structured requirements.

### Phase 3 — Architect (`guides/architect.md`)
Create the plan: task hierarchies, WBS, API needs, facts, checks, skills.
**Output:** `playbook.yml` + `.converge/playbooks/{name}/tasks/` structure.

### Phase 4 — Validate (`guides/validate.md`)
Verify completeness, consistency, executability. Present to user for approval.
**Output:** Validated plan ready for `converge run`.

## Red Flags — STOP and Re-route

- **Skipping analysis on existing codebase** — You'll duplicate work or miss constraints.
- **Planning without understanding user goals** — Plans without requirements are guesswork.
- **Creating 20+ children in one task** — Break into smaller tasks. Max ~7 children per task.
- **No checks on tasks** — Every task needs validation. No exceptions.
- **No facts documented** — Assumptions become bugs. Write facts down.
- **Copying a template without adapting** — Templates are starting points, not solutions.

| Excuse | Reality |
|--------|---------|
| "I know what the user wants" | Ask. Assumptions kill projects. |
| "We can plan as we go" | Rework costs 10x more than upfront planning. |
| "Every task needs WBS" | WBS is for N similar items. Most tasks are simple. |
| "Facts are obvious" | If it's obvious, it takes 10 seconds to write down. Do it. |

## Quick Reference

### Planning Artifacts

```
.converge/
├── project.yml                 # Project config
├── playbooks/
│   └── default/
│       ├── playbook.yml        # Manifest: task list, deps, run config, checks
│       └── tasks/
│           ├── 01-phase-name/
│           │   ├── TASK.md         # Task (any task can have children)
│           │   ├── 001-task/TASK.md
│           │   └── 002-task/
│           │       ├── TASK.md
│           │       └── 001-sub/TASK.md  # Nests arbitrarily deep
│           └── 02-phase-name/
│               └── ...
```

### Plan Components

| Component | Purpose | Where Defined |
|-----------|---------|---------------|
| **Tasks** | Units of work (nest arbitrarily deep) | `TASK.md` in any task directory |
| **WBS** | Dynamic child task spawning | `wbs/index.js` inside task directory |
| **Facts** | Known truths about the project | `playbook.yml` or task TASK.md body |
| **Checks** | Validation commands per task | TASK.md frontmatter `checks:` or `playbook.yml` |
| **Skills** | Converge skills each task needs | TASK.md frontmatter `skills:` |
| **API Needs** | External APIs/integrations | Task TASK.md body or `playbook.yml` |

## Layer Map

```
Layer 0: SKILL.md (this file) — navigation hub
Layer 1: guides/  — phase guides (analyze, discovery, architect, validate)
         guides/  — playbook generation (plan-new-playbook, plan-existing-playbook)
Layer 2: preferences/ — reference (plan-schema, project-patterns, context-principles)
```

**Planning:** Load ONE guide per phase. Return here between phases.
