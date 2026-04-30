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

## Files

```
SKILL.md   — the whole skill: model, principles, delegation patterns, recipe, phases, per-layer planner, validate, anti-patterns
SCHEMA.md  — TASK.md / playbook.yml / WBS API format reference
README.md  — this file (architecture overview)
```

That's it. No `guides/`, no `preferences/`. The skill is short on purpose: a strong mental model that derives the rest.

---

## The Mental Model

**A task is a delegation contract for a scope of work.**

A parent owns the larger problem; children own bounded sub-problems handed off by the parent. Each task is self-contained — its `TASK.md` fully specifies the scope, inputs, outputs, and acceptance checks. Like a company: directors delegate to team leads, who delegate to engineers, who delegate to juniors. At every level the work is bounded, specified, and accepted by checks.

Three principles fall out of this model:

1. **Nested over flat** — separation of concerns. A parent owns one concern; children own sub-concerns.
2. **WBS for replicable work** — one contract template, N instances. Don't hand-write 30 near-identical contracts.
3. **Progressive decomposition by domain × layer** — delegation discipline. Plan only your direct children's contracts, never your grandchildren's.

See `SKILL.md` §1–§2 for the model and principles in full.

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
│           │   ├── TASK.md     # Container contract
│           │   ├── 001-task/TASK.md
│           │   └── 002-task/
│           │       ├── TASK.md
│           │       └── 001-sub/TASK.md   # Nests as deep as needed
│           └── 02-phase-name/
│               ├── TASK.md
│               ├── wbs/index.js   # WBS template (one contract, N instances)
│               └── tasks/         # WBS-spawned children at runtime
│                   └── ...
└── journal/                    # Execution history (runtime, not planning)
```

---

## Anchor Examples

The skill teaches by reference. Read these to see real delegation hierarchies:

| Example | What it shows |
|---|---|
| `examples/baby-app/` | Deep nesting (3 levels): lifecycle → screen domain → sub-layer |
| `examples/stitch-to-flutter-baby-watch-v2/` | WBS templates for per-screen replication, plus a second playbook layering platform concerns |
| `examples/deep-research/` | WBS at every layer; templates for research epochs |
| `examples/cinematic-video-production/` | Domain-first split with WBS at the per-shot/per-sheet layer |

---

## Operational Guidelines

1. **Analysis before planning** — understand the terrain before mapping the route.
2. **Discovery before architecture** — user needs drive the plan, not the other way around.
3. **Contracts over assumptions** — every `TASK.md` is a self-contained delegation contract. Tighten leaky contracts; don't paper over them.
4. **Checks on everything** — if you can't validate it, you can't trust it.
5. **Right-sized tasks** — 3–7 children per task. More means you need to split.
6. **WBS for repetition only** — use WBS when the same contract shape repeats from data. Not for everything.
7. **One layer at a time** — write only your direct children's contracts. Grandchildren are off-limits during planning.
