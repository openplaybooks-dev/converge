---
name: converge-planning
description: >-
  Design a Converge playbook end-to-end: extract the goal, gather requirements,
  decompose it into deliverable tasks, decide what's a static child vs. a
  dynamically spawned template, factor reusable "how-to" into skills, and
  write the TASK.md + playbook.yml contracts with deterministic shell-level
  checks. Use this skill whenever the user says "plan a project", "design a
  playbook", "decompose this goal into tasks", "scaffold a Converge workflow",
  "onboard this codebase to Converge", "restructure work into a playbook", or
  asks how to author TASK.md / playbook.yml / SKILL.md files. Also use it
  before invoking `converge add` or `/converge-control` when no playbook
  exists yet — planning is the prerequisite for execution.
---

# Converge Planning

## When to use this skill

Trigger this skill whenever the user is about to author or restructure a
Converge playbook. Concrete signals:

- A fresh project with no `.converge/` directory and a goal like *"build me
  a SaaS app"*, *"automate this multi-step research"*, or *"turn this
  monorepo into a buildable playbook"*.
- An existing project where the user wants to add a playbook for a new
  workflow (a new fan-out, a new epoch loop, a new domain split).
- An existing playbook that needs restructuring — tasks have grown
  middle-work, the goal tree feels flat, or instructions are duplicated
  across many TASK.md bodies and would benefit from skill extraction.
- The user asks any of: *how do I split this into tasks?*, *what should
  the DAG look like?*, *should this be a static child or a runtime
  spawn?*, *where should this skill live?*, *what should TASK.md
  contain?*

If `.converge/project.yaml` doesn't exist yet, the user should run
`converge init --skills` first; this skill assumes a scaffolded project
and produces the `playbooks/<name>/` structure inside it. After this
skill finishes producing contracts, hand off to `/converge-control` for
execution.

## 1. Core Mental Model

**Nested static tasks first. Spawn only when the child list is genuinely unknown at plan time.**

Converge's power is deep nesting — a task can contain `tasks/` subdirectories with static children, which themselves can contain `tasks/` subdirectories. This is the **preferred architecture**. Every level of nesting is a level of compile-time ordering: the framework knows the full DAG before running.

Spawning is for dynamic work — when the child list comes from a catalog, a directory listing, or an API response. If you can write down the child IDs at plan time, write them as static children.

### How to decompose

```
USER'S GOAL: "A working payment dashboard"

DECOMPOSE INTO NESTED DELIVERABLES:
    │
    ├── 01-prepare/
    │   └── tasks/
    │       ├── 01-db-schema/      # atomic leaf: produces schema.sql
    │       └── 02-seed-data/      # atomic leaf: produces seed.sql
    │
    ├── 02-api/
    │   └── tasks/
    │       ├── 01-charges-endpoint/   # atomic leaf: produces POST /charges
    │       ├── 02-transactions/       # atomic leaf: produces GET /transactions
    │       └── 03-webhooks/          # atomic leaf: produces webhook handler
    │
    ├── 03-dashboard/
    │   └── tasks/
    │       └── 01-dashboard-page/     # atomic leaf: produces dashboard.html
    │
    └── 04-auth/
        └── tasks/
            └── 01-login-flow/         # atomic leaf: produces auth flow
```

**Three hard rules:**
- **Nested first.** Every task can contain `tasks/`. Write static children when you know the list. Use spawn when you don't.
- **Atomic leaves.** Each leaf produces one complete deliverable — one file, one directory, or a small manually-named set. Not "produce some files." Exactly this file.
- **Complete deliverables.** A task that produces half of something the next task finishes is forbidden. Split until each leaf is complete.

### The static vs. dynamic decision

```
Can you list the child task IDs at plan time?
  YES, N ≤ 15  →  Static children under tasks/<parent>/
  YES, N > 15  →  If all children have identical shape → spawn template
                   If stages differ → static children are fine too
  NO (data-driven) → spawn template
```

**Static children win because:**
- Compile-time DAG — no runtime discovery overhead
- Explicit `depends_on` edges are visible in source
- Easier to debug — children appear in `converge list` without running
- Task ordering guaranteed by numeric prefix

### How task behavior is derived (RFC 0045)

The framework derives behavior from artifacts after the body runs:

| What exists after body | Framework behavior |
|---|---|
| `spawn.plan.jsonl` | Apply children (spawner behavior) |
| `spawn:` block in frontmatter + body wrote `<id>/spawn.yml` files | Apply children |
| `converge:` block in frontmatter | Run wave loop (converger behavior) |
| Body empty (no skill, no bash fences) | Done immediately (gateway behavior) |
| None of the above | Check outputs, done (leaf behavior) |

`spawn:` and `converge:` are optional config blocks validated at parse time. `mode:` is gone.

> For the full per-mode contract — schema defaults, halt signals, error codes, exec-dir file map — see `references/task-modes.md`.

### Files are the currency of delivery

Children pass results to their parent through files declared in `outputs:`. The parent's convergence step reads those files via `inputs:`. This is the handshake: parent says "I expect these files," children say "I produce these files."

### Every task has a contract

| Contract part | TASK.md field | What it specifies |
|---|---|---|
| **Scope** | `title` + `description` + body | The bounded deliverable this task owns |
| **Inputs** | `inputs:` | Files the executor reads — children's outputs, upstream data |
| **Outputs** | `outputs:` | Files this task produces — the complete deliverable |
| **Acceptance** | `checks:` | Deterministic predicates that decide done/not-done |
| **Resources** | `skills:` (the *how* carrier), `vars:` | Tools and data the executor may use |
| **Dependencies** | `depends_on:` | Tasks that must complete first |

A contract is **leaky** when any part is missing, vague, or over-broad. The deliverable is the contract's reason to exist.

### Skill-driven tasks: three layers, not two

Each task splits across three layers:

- **TASK.md frontmatter** — the **contract**: `id`, `inputs`, `outputs`, `checks`, `depends_on`. *What* must exist when this task is done.
- **TASK.md body** — the **subjective + context** for *this* instance: which name, which file path, which locale, which catalog row, which iteration. Everything that varies between invocations of the same kind of task.
- **SKILL.md** — the **general how-to**: methodology, conventions, output shape, edge cases. The reasoning that's true for every invocation, not just this one.

When the same general how-to repeats across tasks — or when the methodology will plausibly be reused — factor it into a skill and reference it via `skills: [<name>]` in the task frontmatter. The body then collapses to "use the skill to produce X for these specific inputs"; the methodology lives once, in the skill.

Rule of thumb: if a task body would otherwise contain 30+ lines of "how to do this in general," that body is asking to become a skill. If it's one-time orchestration or a one-line invocation, leave it inline. See `references/skills.md`.

## 2. The Recipe

Five steps from "I have a project" to "here's a playbook." `references/phases.md` walks each step in detail.

1. **Extract the goal.** One sentence — the complete, usable thing that must exist when this is done. Be specific: "A deployed blog with posts, comments, and auth" not "A blog."

2. **Gather requirements.** Categorize as must / should / constraint / non-goal. Each is a specific, testable statement. Also capture **acceptance conditions** ("all API endpoints return 2xx and pass integration tests") — those become playbook-level checks or `goals:` entries.

3. **Decompose into nested sub-goals.** Each sub-goal is a complete, independently verifiable result. 3–7 per level. **Nest under `tasks/<parent>/`** whenever you know the child list. Only spawn when the list is data-driven. Recurse until every leaf is atomic (~15–45 min per agent). Verify *complete cover* as you go.

4. **Write contracts.** For each task, write its TASK.md — title, description, inputs, outputs (atomic — 1 file or manually-named set), checks, `depends_on`. Add optional `spawn:` or `converge:` config only when the task genuinely needs dynamic children or wave looping:
   - `spawn: { min_children, max_children, apply }` → body writes `<id>/spawn.yml` per child
   - `converge: { max_waves, halt_when, wave_check }` → body re-runs per wave until halt signal fires
   - No `spawn:`/`converge:` → leaf behavior (check outputs, done)
   - Empty body → gateway (done immediately)

5. **Validate.** Every output has a deterministic check. Every input traces to an upstream output. No orphan outputs. Each leaf produces exactly one complete deliverable. See §7 for the full contract review checklist.

**The goal decomposition drives everything.** Start with nested static tasks. Reach for spawn only when the child list is genuinely unknown at plan time.

## 3. Common Nesting Patterns

Study these real-world patterns from shipped playbooks:

### Pattern A: Nested epic containers (flutter-app, baby-app)

Three levels deep. Top-level containers are delivery phases. Each phase contains static children. One phase fans out dynamically to templates for per-entity children.

```
01-prepare-requirements/
├── TASK.md                   # Container: produces screens.json
└── tasks/
    ├── 01-gather-idea/      # Static leaf: produces idea.md
    ├── 02-generate-prd/     # Static leaf: produces PRD.md
    └── 03-generate-ux/       # Static leaf: produces UX.md

03-build-screens/
├── TASK.md                   # Container + spawner: fans out per screen
└── tasks/                   # ← no static children — all are spawned
```

### Pattern B: Static pipeline with template children (test-seeding)

Two-level: static parent with static children under tasks/, but children invoke templates which spawn further grandchildren. Parent orchestrates; children are template instances.

```
parent/
├── TASK.md                   # Static parent: spawns 2 children
└── tasks/                    # ← no children here — this IS the parent
templates/
├── child-alpha/
│   └── tasks/
│       ├── sub-alpha/        # Level 2: spawned by child-alpha
│       └── sub-beta/
└── child-beta/               # Level 2: leaf (no children)
```

### Pattern C: Converger root with template epochs (test-goal-driven, evolutionary-optimization)

Root is a static `tasks/` task with `converge:` config. Each wave spawns one epoch template. The epoch template contains static children.

```
build/
├── TASK.md                   # Static root: converger, spawns sprint per wave
templates/
├── sprint/
│   └── tasks/
│       ├── 01-implement/    # Static leaf: per sprint
│       └── 02-verify/       # Static leaf: per sprint
└── phase/                    # One phase template reused across sprints
```

### Decision guide for each container node

When you reach a container task during decomposition, ask:

| Can you list children at plan time? | How many? | What to use |
|---|---|---|
| YES | N ≤ 7 | Static `tasks/` children (preferred) |
| YES | N > 7 | Static `tasks/` children still fine — the runtime discovers them all |
| YES, all identical shape | Large N | Spawn template (all children are same contract) |
| NO (data-driven list) | Any | Spawn template |

Static `tasks/` children are **always valid** regardless of N. The spawn template option exists for ergonomics (avoiding hand-writing 50 near-identical TASK.md files for a catalog), not correctness.

## 4. Four Principles

1. **Nested over flat** — A goal owns one concern; sub-goals own sub-concerns. 3–7 children per node. Smells: one-child node, mixed-shape siblings, verb-named children.
2. **Static before dynamic** — When you know the child list, write it as `tasks/<parent>/<child>/TASK.md`. You get compile-time ordering, full visibility, and easier debugging. Use spawn only when the list comes from runtime data.
3. **Atomic leaves** — One leaf produces one complete deliverable. Not "produce the API layer." Not "produce the UI." Produce exactly `src/endpoints/charges.ts`. The narrower the output, the easier it is to verify, retry, and reuse.
4. **Progressive decomposition** — Decompose one layer at a time. When invoked at a node, plan only its direct children. Never reach into grandchildren.

## 5. Not Middle Work

**Every task output must be a complete, usable deliverable.** This is the single most important rule. Middle work is the #1 reason playbooks fail to satisfy.

### The diagnostic — three questions for every task:

1. **"Can someone use this output directly?"** If the output is instructions, plans, or partial work that needs further processing — it's middle work.
2. **"Does the next task finish this output, or consume it?"** If *finish* → middle work. Split differently. If *consume* (as a complete input to produce its own deliverable) → correct.
3. **"Is this one file or a manually-named set?"** If "some files" or "various outputs" — too broad. Narrow to exactly what this task produces.

### Examples:

| Middle work (wrong) | Atomic deliverable (right) |
|---|---|
| "Design the database schema" → next task implements it | "Working database with schema + seed data" (schema.sql + seed.sql, verified by running) |
| "Write the API spec" → next task codes it | "Working /charges endpoint with passing tests" |
| "Prepare the project" → installs deps, creates folders | "Runnable project skeleton with health-check endpoint" |
| "Generate UI components" → produces 40 files with no individual checks | One `Button.tsx` component with one `Button.test.ts` |

**The golden rule:** if you can't point to exactly one file as the output, the task is too broad.

## 6. Requirement Coverage

Before writing any contract, verify requirement completeness:

1. **List every user requirement** extracted from the prompt and discovery questions. Number them.
2. **For each requirement, identify which sub-goal(s) fulfill it.** One requirement may map to multiple sub-goals. One sub-goal may fulfill multiple requirements.
3. **Flag gaps.** Any requirement with zero mappings → missing sub-goal. Add one.
4. **Flag creep.** Any sub-goal with zero mapped requirements → it's not serving the user's goal. Remove it or justify why it's necessary infrastructure.
5. **Check the union.** Reading all sub-goal deliverables together, would a user say "yes, that's what I asked for"? If not, what's missing?

This step takes 2 minutes and catches the #2 reason playbooks fail: missed requirements.

## 7. Validate (Contract Review)

For every `TASK.md`, check:

- **Bounded scope.** Title is one sentence. Body is concrete.
- **Atomic output.** `outputs:` names exactly what this task produces — one file, one directory, or a small manually-named set. Not "various files."
- **Sharp inputs.** Every `input` traces to an upstream `output`. No orphans. No `src/**/*` globs.
- **Specific outputs.** Exactly this path, not glob patterns unless truly exhaustive.
- **Result-named, not process-named.** `outputs:` describe a result that exists — not a stage of work.
- **Deterministic checks.** Every output has at least one check. Checks return 0 / non-zero. No string matching.
- **Self-contained.** An executor reading only this `TASK.md` and its declared inputs can complete the work.
- **Body is instructions only.** No work product pasted into the body.
- **Acyclic deps.** No cycles. Deps are minimal — only what's actually consumed.

**DAG-level checks:**

- **Every requirement maps to ≥1 task.** Rerun the requirement coverage check on the final contract tree.
- **Edges are explicit.** Every dependency is declared via `depends_on:`. No task relies on sort-order alone.
- **Nested depth is appropriate.** If a container has only 1 child, consider collapsing. If a container has >10 children, consider grouping.
- **Static/dynamic choice is justified.** Known, stable child lists → static `tasks/` children. Data-driven lists → spawn template.
- **Outputs trace to inputs.** Every `outputs:` entry is consumed downstream or is a terminal deliverable. No orphan outputs.

When validation passes, the plan is ready for `converge run --playbook=<name>`.

## 8. Anti-Patterns

Common pitfalls: flat 30-task playbooks, process-stage decomposition, orphan inputs, reaching into grandchildren, hard-coding project data into playbooks, no checks on tasks. If validation flags a pattern, see `references/anti-patterns.md` for the full catalog.

### The most expensive anti-patterns

- **Flat playbook** — one `tasks/` directory with 20+ sibling tasks. Group related tasks into containers. A flat list can't express sub-goal boundaries.
- **Process decomposition** — verb-named siblings (`fetch → clean → analyze`) that each process the whole population. Re-decompose by entity, each owning its end-to-end result.
- **Middle work** — tasks that produce partial results finished by the next task. Every leaf delivers something complete.
- **Missing requirements** — proceeding to contracts without verifying every user requirement maps to a sub-goal.
- **Spawn when static would do** — using spawn templates for a known list of N ≤ 15 children that could have been written as static `tasks/` children. Static children are more debuggable, more visible, and have no runtime discovery overhead.

### Spawn vs. static decision

**Use static `tasks/` children when:**
- The child list is known at plan time
- N ≤ ~15 (even for larger N, static is valid — it's just more files to write)
- Children have different contracts from each other (different outputs, different checks)

**Use spawn templates when:**
- The child list is data-driven (catalog, directory listing, API response)
- N > ~15 and all children share the same contract (same outputs shape, same checks)
- The same child shape repeats many times and writing N static files would be tedious

## 9. Reference Index

Load these on demand:

| Reference | When to load |
|---|---|
| `references/model.md` | Goal decomposition, convergence, DAG theory, full principles |
| `references/patterns.md` | Common nesting shapes (Ordered Stages, Domain Split, Epoch Loop, etc.) with static/dynamic per shape |
| `references/task-modes.md` | Task behavior derivation (spawn.plan.jsonl / converge: / empty body / leaf) — schema defaults, halt signals, error codes, exec-dir file map |
| `references/tests.md` | Writing checks that call explicit `scripts/...` helpers |
| `references/phases.md` | Step-by-step execution guide with commands |
| `references/anti-patterns.md` | Full anti-patterns catalog |
| `references/schema.md` | TASK.md / playbook.yml / spawn-template format reference |
| `references/skills.md` | Skill-driven authoring: when to factor a skill, where it lives, SKILL.md format |

## 10. Quick Reference

### Anchor playbooks

| Example | Nesting depth | What it shows |
|---|---|---|
| `examples/flutter-app/` | 3 levels | Epic containers → static children → spawner for screens |
| `examples/baby-app/` | 3 levels | Lifecycle → screen domain → sub-layer per screen |
| `tests/test-seeding/` | 3 levels | Static parent → template children → template grandchildren |
| `tests/test-goal-driven/` | 3 levels | Converger root → sprint template → phase template |
| `examples/deep-research/` | 3 levels | Bootstrap spawner → template epochs → static children |
| `examples/evolutionary-optimization/` | 2 levels | Converger root → template phases |

### Directory layout

```
.converge/
├── project.yaml
└── playbooks/
    └── default/
        ├── playbook.yml
        ├── PLAN.md
        ├── tasks/                      # Top-level static tasks
        │   ├── 01-prepare/
        │   │   ├── TASK.md
        │   │   └── tasks/              # Level 2 static children
        │   │       ├── 01-schema/
        │   │       │   └── TASK.md
        │   │       └── 02-seed/
        │   │           └── TASK.md
        │   └── 02-build/
        │       ├── TASK.md             # Container + spawner (dynamic children from template)
        │       └── tasks/              # ← none here if this container spawns
        ├── templates/                   # Spawn templates (runtime children)
        │   ├── screen/
        │   │   ├── TASK.md            # Template contract with {{screenId}}
        │   │   └── PARAMS.yml
        │   └── sprint/
        │       ├── TASK.md
        │       └── PARAMS.yml
        └── scripts/
            ├── file-exists.sh
            └── validate-output.js
```

IDs under `tasks/` **must** use `\d{2,3}-` prefixes (e.g., `01-schema`, `02-migrate`). This is how `discoverStaticChildren` finds them. Top-level task directories use kebab-case without prefixes.

### CLI commands

| Command | What it does |
|---|---|
| `converge init` | Scaffold `.converge/project.yaml` + skills. |
| `converge add` | Create a playbook in the current project. |
| `converge list` (alias `ls`) | Preview which tasks would run for a given `--select` expression. |
| `converge run` | Execute the convergence loop. Optional: `--dry`, `--resume`, `--fail-fast`, `--select <expr>`. |
| `converge show` | Visualize: `gantt`, `graph`, `journal`, `metrics`. |
| `converge inspect` | Drill into a specific task's checkpoints and session history. |
| `converge playbook validate` | Validate the playbook definition. |
| `converge doctor` | Health-check the runtime state. |
| `converge clean` | Reset transient state. Surgical, leaves source alone. |
| `converge stop` | Stop an active run. |

## 11. Related Skills

```
converge-planning              converge-control
(what to build)         →     (how to execute)
Goal → Sub-goals →            Run → Debug →
Contracts → Validate          Plan tasks → Verify
```

Handoff: converge-planning produces `.converge/playbooks/{name}/` structure, then converge-control takes over for execution. PLAN.md describes the delegation structure; the runtime expands it.