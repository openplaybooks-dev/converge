# Converge Planning Architecture

## Purpose

Comprehensive upfront planning for projects before execution. While `converge-control` handles running, debugging, and task-level planning, `converge-planning` handles the strategic layer: understanding what to build and structuring the full plan.

## Relationship to Other Skills

```
converge-planning              converge-control              repair-control
(what to build)         →     (how to execute)        →    (how to fix)
Analyze → Discover →          Run → Debug →                Detect gap →
Architect → Validate          Plan tasks → Verify          Route strategy →
                                                           Repair
```

**Handoff:** `converge-planning` creates the `.converge/playbooks/{name}/tasks/` structure, then `converge-control` takes over for execution.

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
| `architect.md` | 3 | Create task hierarchies, WBS, facts, checks, skills |
| `validate.md` | 4 | Verify plan completeness and consistency |

### Preferences (Layer 2)

| File | Purpose |
|------|---------|
| `plan-schema.md` | Complete artifact format reference (tasks, facts, checks, WBS, API needs) |
| `project-patterns.md` | Common project archetypes with starter templates |
| `context-principles.md` | Three foundational principles: progressive enrichment, context interpolation, context offloading |

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
.converge/
├── project.yml                 # Project config
├── playbooks/
│   └── default/
│       ├── playbook.yml        # Manifest: task list, deps, run config, checks
│       └── tasks/
│           ├── 01-phase-name/
│           │   ├── TASK.md     # Task definition
│           │   ├── 001-task/
│           │   │   └── TASK.md
│           │   └── 002-task/
│           │       ├── TASK.md
│           │       ├── 001-sub/    # Tasks nest arbitrarily deep
│           │       │   └── TASK.md
│           │       └── 002-sub/
│           │           └── TASK.md
│           └── 02-phase-name/
│               ├── TASK.md
│               ├── wbs/        # WBS scripts (if dynamic children)
│               │   └── index.js
│               └── tasks/      # WBS-spawned children
│                   └── ...
└── journal/                    # Execution history (runtime, not planning)
```

---

## Foundational Principles

Three principles govern how converge-planning decomposes problems and manages context. See `preferences/context-principles.md` for full reference.

1. **Progressive Enrichment** — Decompose complex problems recursively; each phase refines context from the previous.
2. **Context Interpolation** — Explicit context contracts (inputs/outputs) between tasks so each executor has exactly what it needs.
3. **Context Offloading** — Use files (MD for specs, JSON for state, skills for instructions) instead of large prompts.

## Operational Guidelines

1. **Analysis before planning** — Understand the terrain before mapping the route.
2. **Discovery before architecture** — User needs drive the plan, not the other way around.
3. **Facts over assumptions** — Write down what you know. Flag what you don't.
4. **Checks on everything** — If you can't validate it, you can't trust it.
5. **Right-sized tasks** — 3-7 children per task. More means you need to split.
6. **WBS for repetition only** — Use WBS when spawning N similar tasks. Not for everything.
