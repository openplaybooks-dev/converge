---
name: harness-planning
description: Use when starting a fresh project, onboarding an existing codebase, or creating a comprehensive project plan with epics, tasks, WBS, facts, checks, and skills
---

# Harness Planning

## Overview

Structured project planning for fresh or existing projects. Analyze codebase, discover user needs, architect the plan, validate before execution.

**Protocol:** Analyze → Discover → Architect → Validate → Hand off to `harness-control` for execution.

## Phase Detection Matrix

| Situation | Detection | Route To |
|-----------|-----------|----------|
| Fresh project, no code | Empty or scaffold-only directory | `guides/discovery.md` (skip analyze) |
| Existing codebase, no `.harness/` | Code exists but no harness | `guides/analyze.md` → then discovery |
| Existing codebase + harness, need new plan | `.harness/` exists, user wants replanning | `guides/analyze.md` → then architect |
| User described idea, need plan | User gave requirements | `guides/architect.md` |
| Plan exists, need validation | `.harness/plan.md` or epics exist | `guides/validate.md` |
| Generate playbook from prompt | `harness plan --prompt "..."` (new playbook) | `guides/plan-new-playbook.md` |
| Modify/extend existing playbook | `harness plan --prompt "..." --update` | `guides/plan-existing-playbook.md` |
| Need artifact format reference | Creating plan manually | `preferences/plan-schema.md` |
| Need project template | Common project type | `preferences/project-patterns.md` |

## Playbook Generation Modes

When generating a playbook via `harness plan`, the AI auto-selects between two modes:

- **Standard** (scan + architect) — Prompt is specific and actionable. Skip discovery.
- **Deep** (all 4 phases) — Prompt is vague or exploratory. Run full analysis + discovery first.

See `guides/plan-new-playbook.md` for mode selection rules.

## Planning Phases

```
Phase 1: ANALYZE ──► Phase 2: DISCOVER ──► Phase 3: ARCHITECT ──► Phase 4: VALIDATE
 (codebase)           (user needs)          (create plan)          (verify plan)
                                                                        │
                                                                        ▼
                                                              Hand off to harness-control
```

### Phase 1 — Analyze (`guides/analyze.md`)
Scan the project: tech stack, file structure, existing work, dependencies, patterns.
**Output:** `.harness/analysis.md` — project snapshot.

### Phase 2 — Discover (`guides/discovery.md`)
Understand what the user wants: goals, constraints, priorities, non-functional requirements.
**Output:** `.harness/requirements.md` — structured requirements.

### Phase 3 — Architect (`guides/architect.md`)
Create the plan: epics, nested tasks, WBS, API needs, facts, checks, skills.
**Output:** `.harness/plan.md` + `.harness/epics/` structure.

### Phase 4 — Validate (`guides/validate.md`)
Verify completeness, consistency, executability. Present to user for approval.
**Output:** Validated plan ready for `harness run`.

## Red Flags — STOP and Re-route

- **Skipping analysis on existing codebase** — You'll duplicate work or miss constraints.
- **Planning without understanding user goals** — Plans without requirements are guesswork.
- **Creating 20+ tasks in one epic** — Break into smaller epics. Max ~7 tasks per epic.
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
.harness/
├── analysis.md          # Phase 1 output: project snapshot
├── requirements.md      # Phase 2 output: user needs
├── plan.md              # Phase 3 output: master plan
└── epics/               # Phase 3 output: executable structure
    ├── 01-epic-name/
    │   ├── EPIC.md
    │   ├── 001-task/TASK.md
    │   └── 002-task/TASK.md
    └── 02-epic-name/
        └── ...
```

### Plan Components

| Component | Purpose | Where Defined |
|-----------|---------|---------------|
| **Epics** | High-level work packages | `.harness/epics/NN-name/EPIC.md` |
| **Tasks** | Atomic units of work | `.harness/epics/NN-name/NNN-task/TASK.md` |
| **WBS** | Dynamic subtask spawning | `wbs.js` inside task directory |
| **Facts** | Known truths about the project | `.harness/plan.md` § Facts |
| **Checks** | Validation commands per task | TASK.md frontmatter `checks:` |
| **Skills** | Harness skills each task needs | TASK.md frontmatter `skills:` |
| **API Needs** | External APIs/integrations | `.harness/plan.md` § API Needs |

## Layer Map

```
Layer 0: SKILL.md (this file) — navigation hub
Layer 1: guides/  — phase guides (analyze, discovery, architect, validate)
         guides/  — playbook generation (plan-new-playbook, plan-existing-playbook)
Layer 2: preferences/ — reference (plan-schema, project-patterns)
```

**Planning:** Load ONE guide per phase. Return here between phases.
