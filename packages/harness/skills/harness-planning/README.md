# Harness Planning Architecture

## Purpose

Comprehensive upfront planning for projects before execution. While `harness-control` handles running, debugging, and task-level planning, `harness-planning` handles the strategic layer: understanding what to build and structuring the full plan.

## Relationship to Other Skills

```
harness-planning              harness-control              repair-control
(what to build)         →     (how to execute)        →    (how to fix)
Analyze → Discover →          Run → Debug →                Detect gap →
Architect → Validate          Plan tasks → Verify          Route strategy →
                                                           Repair
```

**Handoff:** `harness-planning` creates the `.harness/epics/` structure, then `harness-control` takes over for execution.

---

## Layer System

```
SKILL.md (entry point) → playbooks (phase guides) → preferences (reference)
```

### Playbooks (Layer 1)

| File | Phase | Purpose |
|------|-------|---------|
| `analyze.md` | 1 | Scan codebase, detect tech stack, map current state |
| `discovery.md` | 2 | Structured user interview, requirements capture |
| `architect.md` | 3 | Create epics, tasks, WBS, facts, checks, skills |
| `validate.md` | 4 | Verify plan completeness and consistency |

### Preferences (Layer 2)

| File | Purpose |
|------|---------|
| `plan-schema.md` | Complete artifact format reference (epics, tasks, facts, checks, WBS, API needs) |
| `project-patterns.md` | Common project archetypes with starter templates |

---

## Progressive Loading

**Start:** SKILL.md (~90 lines)
**Then:** Load ONE playbook per phase

| Phase | Context Loaded |
|-------|---------------|
| Analyze only | ~300 lines |
| Analyze + Discover | ~550 lines |
| Full planning cycle | ~1200 lines |
| With reference | ~1800 lines |

---

## Planning Output Structure

```
.harness/
├── analysis.md              # Project snapshot (tech stack, state, patterns)
├── requirements.md          # User needs (goals, constraints, priorities)
├── plan.md                  # Master plan (epics overview, facts, API needs, dependency flow)
└── epics/
    ├── 01-epic/
    │   ├── EPIC.md          # Epic metadata
    │   ├── 001-task/
    │   │   └── TASK.md      # Task with checks, skills, inputs, outputs
    │   └── 002-task/
    │       ├── TASK.md
    │       └── wbs.js       # Dynamic subtask spawning (if needed)
    └── 02-epic/
        └── ...
```

---

## Design Principles

1. **Analysis before planning** — Understand the terrain before mapping the route.
2. **Discovery before architecture** — User needs drive the plan, not the other way around.
3. **Facts over assumptions** — Write down what you know. Flag what you don't.
4. **Checks on everything** — If you can't validate it, you can't trust it.
5. **Right-sized epics** — 3-7 tasks per epic. More means you need to split.
6. **WBS for repetition only** — Use WBS when spawning N similar tasks. Not for everything.
