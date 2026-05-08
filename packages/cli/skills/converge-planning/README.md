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
SKILL.md   — the whole skill: model, principles, delegation patterns, recipe, phases, validate, anti-patterns
SCHEMA.md  — TASK.md / playbook.yml / seed API format reference
README.md  — this file (architecture overview)
```

That's it. No `guides/`, no `preferences/`. The skill is short on purpose: a strong mental model that derives the rest.

---

## The Mental Model

**A task is a delegation contract for a scope of work. A playbook is a DAG of such contracts.**

A parent owns the larger problem; children own bounded sub-problems handed off by the parent. Each task is self-contained — its `TASK.md` fully specifies the scope, inputs, outputs, and acceptance checks. Dependencies form explicit edges; the framework computes execution order topologically. Like a company: directors delegate to team leads, who delegate to engineers, who delegate to juniors. At every level the work is bounded, specified, and accepted by checks.

Four principles fall out of this model:

1. **Nested over flat** — separation of concerns. A parent owns one concern; children own sub-concerns.
2. **Seed for replicable work** — one contract template, N instances. Don't hand-write 30 near-identical contracts. Subtasks can be **static** (hand-written `TASK.md`, concrete at compile time) or **dynamic** (seed-spawned via seeds, resolved at runtime).
3. **Progressive decomposition by domain × layer** — delegation discipline. Plan only your direct children's contracts, never your grandchildren's.
4. **Tests as first-class** — checks are DAG nodes, same as tasks. Write tests during planning, not after. Tag by cost (`fast`/`slow`).

See `SKILL.md` §1–§2 for the model and principles in full.

---

## Planning Output Structure

```
.converge/
├── project.yml                 # Project config
├── playbooks/
│   └── default/
│       ├── playbook.yml        # Manifest: task list, deps, run config, checks
│       ├── PLAN.md             # Root plan (DAG blueprint)
│       ├── tasks/              # static contracts (hand-written)
│       │   ├── prepare/
│       │   │   ├── TASK.md     # Container contract
│       │   │   ├── PLAN.md     # Container blueprint
│       │   │   └── catalog/
│       │   │       └── TASK.md # Leaf executable
│       │   └── wire/
│       │       ├── TASK.md
│       │       └── PLAN.md
│       └── seeds/              # dynamic contracts (data-driven fan-out)
│           ├── build-screens/
│           │   ├── SEED.md     # Seed contract
│           │   └── index.js    # Runtime spawn script
│           └── per-character/
│               ├── SEED.md
│               └── index.js
└── journal/                    # Execution history (runtime, not planning)
```

**tasks/ vs seeds/:** Static tasks go in `tasks/` (hand-written, concrete at compile time). Dynamic seeds go in `seeds/` (spawn children at runtime, resolved via `converge compile --seed`). Seeds are never expanded during `init`.

---

## Anchor Examples

The skill teaches by reference. Read these to see real delegation hierarchies:

| Example | What it shows |
|---|---|
| `examples/baby-app/` | Deep nesting (3 levels): lifecycle → screen domain → sub-layer |
| `examples/stitch-to-flutter-baby-watch-v2/` | seed templates for per-screen replication, plus a second playbook layering platform concerns |
| `examples/deep-research/` | seed at every layer; templates for research epochs |
| `examples/cinematic-video-production/` | Domain-first split with seed at the per-shot/per-sheet layer |

---

## Operational Guidelines

1. **Analysis before planning** — understand the terrain before mapping the route.
2. **Discovery before architecture** — user needs drive the plan, not the other way around.
3. **Contracts over assumptions** — every `TASK.md` is a self-contained delegation contract. Tighten leaky contracts; don't paper over them.
4. **DAG-first design** — every dependency is an explicit edge. Sort-order is for humans; edges are for the framework.
5. **Static first, dynamic when needed** — default to hand-written subtasks. Use seed only when the list is data-driven or N > 7. Prefer catalog + seed (*expected*) over frontier seed.
6. **Checks on everything** — if you can't validate it, you can't trust it. Every output has a check. Cross-task invariants have playbook-level checks. Tag tests by cost.
7. **Right-sized tasks** — 3–7 children per task. More means you need to split.
8. **One layer at a time** — write only your direct children's contracts. Grandchildren are off-limits during planning.
9. **Frontiers are honest** — if a seed parent's children are unknowable at plan time, mark it as frontier. Don't pretend the DAG is fully concrete when it isn't.
