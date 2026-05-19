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

**Start with the playbook. Work backwards from the finished result.**

Converge is not trying to freeze work into a brittle static workflow. The playbook is the durable artifact: a living specification that can branch, spawn new work, adapt to the state of the repo, and keep going until its checks pass.

Planning means writing that specification clearly enough that the runtime can execute it autonomously.

Every project begins with one question: *what must exist when this is done?* The answer is the **goal** — a complete, usable deliverable. If the goal is too large for one agent, split it into **sub-goals**. Each sub-goal is itself a complete, deliverable result. Repeat until every leaf is workable by one agent in one session.

```
USER'S GOAL: "A working payment dashboard"
    │
    ├── Sub-goal A: Database schema + seed data
    │   Deliverable: migration.sql + seed.sql (runnable, verified)
    │
    ├── Sub-goal B: Payment API endpoints
    │   Deliverable: working API server with passing tests
    │
    ├── Sub-goal C: Dashboard UI
    │   Deliverable: rendered dashboard page with live data
    │
    └── Sub-goal D: Auth + permissions
        Deliverable: login flow with role-based access checks

Each sub-goal is SCOPED, DELIVERABLE, WORKABLE. No middle work.
```

This is recursive. Sub-goal B ("Payment API") might split further into "POST /charges endpoint," "GET /transactions endpoint," and "Webhook handler" — each a complete, testable deliverable.

**Three hard rules:**
- **Every task produces a complete deliverable.** A task that produces "half of X that the next task finishes" is forbidden. Split X into smaller complete deliverables instead.
- **Decompose by what exists when done, not by what happens.** Sub-goals are named by the result they produce (nouns), not the activity (verbs). "Database schema" not "Design database."
- **Requirements drive decomposition.** Extract every user requirement first. Then verify every requirement maps to at least one sub-goal. No orphan requirements.

**The goal tree becomes the playbook.** Each sub-goal becomes a task contract. In current Converge, that usually means one of three task shapes:

- **Executable leaf** — one task body produces one complete deliverable and passes its checks.
- **Static container** — a parent groups hand-written child tasks and converges their outputs.
- **Dynamic container** — a passthrough parent writes a JSONL spawn manifest to `$CONVERGE_TASK_DIR/spawn.plan.jsonl` and runs `converge apply $CONVERGE_TASK_DIR/spawn.plan.jsonl`. A result-clean check (`grep -q '"ok":false' $CONVERGE_TASK_DIR/spawn.plan.result.jsonl` → fail) decides done/not-done; the converge prompt patches the manifest on failure and the loop reapplies until clean.

The contract structure (`inputs:`, `outputs:`, `checks:`) remains the engineering backbone.

### The modern dynamic/container pattern

When work is not fully knowable at plan time, prefer the runtime pattern the framework actually exercises in tests:

1. A parent task is marked `passthrough: true`.
2. Its body performs orchestration work and emits `converge spawn ...` commands to materialize child tasks from `templates/<name>/TASK.md`.
3. The body writes on-disk evidence that later checks can verify.
4. A `converge` prompt runs after the body and decides whether the task should continue for another wave or halt.
5. When the parent knows it is done, it marks itself with `converge tasks mark <id> --status done`.

This is the current idiomatic shape for multi-wave or adaptive workflows. The runtime loop is driven by failing checks and post-body convergence, not by hand-written while-loops.

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

> For the full model including DAG semantics, convergence patterns, and the principles in depth, see `references/model.md`.

### Skill-driven tasks: three layers, not two

Each task splits across three layers, not two:

- **TASK.md frontmatter** — the **contract**: `id`, `inputs`, `outputs`, `checks`, `depends_on`. *What* must exist when this task is done.
- **TASK.md body** — the **subjective + context** for *this* instance: which name, which file path, which locale, which catalog row, which iteration. Everything that varies between invocations of the same kind of task.
- **SKILL.md** — the **general how-to**: methodology, conventions, output shape, edge cases. The reasoning that's true for every invocation, not just this one.

When the same general how-to repeats across tasks — or when the methodology will plausibly be reused — factor it into a skill and reference it via `skills: [<name>]` in the task frontmatter. The body then collapses to "use the skill to produce X for these specific inputs"; the methodology lives once, in the skill.

Rule of thumb: if a task body would otherwise contain 30+ lines of "how to do this in general," that body is asking to become a skill. If it's one-time orchestration or a one-line invocation, leave it inline. See `references/skills.md` for the full guide — when to create one, where to put it (playbook-scoped vs. project-scoped), and the Anthropic-compatible SKILL.md frontmatter.

## 2. The Recipe

Five steps from "I have a project" to "here's a playbook." `references/phases.md` walks each step in detail.

1. **Extract the goal.** One sentence — the complete, usable thing that must exist when this is done. Be specific: "A deployed blog with posts, comments, and auth" not "A blog."

2. **Gather requirements.** Categorize as must / should / constraint / non-goal. Each is a specific, testable statement. Also capture **acceptance conditions** ("all API endpoints return 2xx and pass integration tests") — those become playbook-level checks or `goals:` entries.

3. **Decompose into sub-goals.** Each sub-goal is a complete, independently verifiable result. 3–7 per level. Recurse until every leaf is workable by one agent in one session (~15–45 min). Verify *complete cover* as you go: every requirement maps to ≥1 sub-goal; every sub-goal traces to ≥1 requirement.

4. **Write contracts.** For each task, write its TASK.md — title, description, inputs (what it reads), outputs (its complete deliverable), checks (how to verify), `depends_on` (what must finish first). Choose the right task shape:
   - leaf → one executable body
   - static container → children under `tasks/`
   - dynamic container → `passthrough` body that writes `$CONVERGE_TASK_DIR/spawn.plan.jsonl` + runs `converge apply` + a result-clean check (every row in `spawn.plan.result.jsonl` is `ok:true`)

5. **Validate.** Every output has a deterministic check. Every input traces to an upstream output. No orphan outputs. Checks return 0 / non-zero. See §7 for the full contract review checklist.

**The goal decomposition drives everything.** Don't start by picking a pattern — patterns describe what a good decomposition looks like after the fact.

## 3. Common Goal-Tree Shapes

After decomposing the goal, the resulting task tree will often match one of these shapes. Use them to sanity-check your decomposition, not to drive it.

| When goals share this shape... | The tree looks like... | Example |
|---|---|---|
| **Ordered delivery stages** — each goal depends on the prior one's output | Linear: `goal-a → goal-b → goal-c` | Data pipeline: dataset → analysis → report |
| **Entity fan-out** — same deliverable shape for N similar entities | One dynamic container spawning N templated children + parent convergence | Per-screen UI generation, per-endpoint API |
| **Iterative refinement** — quality improves over rounds until convergence | Epoch loop: same template repeated, stop on quality check | Research, optimization, tuning |
| **Domain split** — N distinct domains, each with its own sub-tree | Parallel domain pipelines with shared upstream specs | Game assets: characters, props, scenes each get a pipeline |
| **Creative progression** — early goals are singletons, late goals fan out over assets | Sequential early stages + late-stage per-asset fan-out | Video production: story → cast → per-shot storyboard |
| **Goal-driven epochs** — measurable completion conditions, adaptive epochs work on remaining goals until all pass | Root passthrough container spawns one epoch / sprint per wave, then halts when checks and converge verdict agree | Fix all type errors, make all tests pass, improve coverage |

A real project often mixes shapes. The top-level might be ordered stages, while one stage fans out per entity. Let the goal tree dictate the shape — don't force the shape onto the goal.

> For full shape descriptions with static/dynamic behavior and test strategies, see `references/patterns.md`.

## 4. Three Principles

1. **Nested over flat** — A goal owns one concern; sub-goals own sub-concerns. 3–7 children per node. Smells: one-child node, mixed-shape siblings, verb-named children.
2. **Template replicable work** — When N children share the same deliverable shape, write the contract once under `templates/` and spawn instances at runtime. Don't hand-write near-copies.
3. **Progressive decomposition** — Decompose one layer at a time. When invoked at a node, plan only its direct children. Never reach into grandchildren.

> For the full exposition, see `references/model.md`.

## 5. Not Middle Work

**Every task output must be a complete, usable deliverable.** This is the single most important rule. Middle work is the #1 reason playbooks fail to satisfy.

### The diagnostic — three questions for every task:

1. **"Can someone use this output directly?"** If the output is instructions, plans, or partial work that needs further processing — it's middle work.
2. **"Does the next task finish this output, or consume it?"** If *finish* → middle work. Split differently. If *consume* (as a complete input to produce its own deliverable) → correct.
3. **"Is this a complete thing that exists, or a stage of producing a thing?"** If *stage* → middle work. Re-decompose by complete things.

### Examples:

| Middle work (wrong) | Complete deliverable (right) |
|---|---|
| "Design the database schema" → next task implements it | "Working database with schema + seed data" (migration.sql + seed.sql, verified by running) |
| "Write the API spec" → next task codes it | "Working /charges endpoint with passing tests" |
| "Prepare the project" → installs deps, creates folders | "Runnable project skeleton with health-check endpoint" |
| "Analyze the codebase" → produces analysis.md | Not a task at all — it's research the AI does while planning |

**The golden rule:** if you can't hand the output to a user and they can use it, it's not done.

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
- **Complete deliverable.** Output is a usable thing, not a stage of work. Passes the "not middle work" diagnostic.
- **Sharp inputs.** Every `input` traces to an upstream `output`. No orphans. No `src/**/*` globs.
- **Specific outputs.** Specific paths, not "various files."
- **Result-named, not process-named.** `outputs:` describe a result that exists — not a stage of work.
- **Deterministic checks.** Every output has at least one check. Checks return 0 / non-zero. No string matching.
- **Self-contained.** An executor reading only this `TASK.md` and its declared inputs can complete the work.
- **Body is instructions only.** No work product pasted into the body — specs, designs, data live in declared files.
- **Acyclic deps.** No cycles. Deps are minimal — only what's actually consumed.
- **Container behavior is explicit.** If this task is orchestration-only, make that obvious with a passthrough body, spawn templates, and a converge contract.

**DAG-level checks:**

- **Every requirement maps to ≥1 task.** Rerun the requirement coverage check on the final contract tree.
- **Edges are explicit.** Every dependency is declared via `depends_on:`. No task relies on sort-order alone.
- **Static/dynamic choice is justified.** Known, stable child lists can stay static; adaptive or large child lists should use runtime spawn templates.
- **Tests cover the DAG.** Every output has a check. Containers have cross-child consistency checks.
- **Dynamic loops have a stop rule.** If a task can re-run, its checks and converge contract must make the halt condition obvious.
- **Outputs trace to inputs.** Every `outputs:` entry is consumed downstream or is a terminal deliverable. No orphan outputs.

When validation passes, the plan is ready for `converge run --playbook=<name>`.

## 8. Anti-Patterns

Common pitfalls: flat 30-task playbooks, process-stage decomposition, orphan inputs, reaching into grandchildren, hard-coding project data into playbooks, no checks on tasks. If validation flags a pattern, see `references/anti-patterns.md` for the full catalog.

### The most expensive anti-patterns

- **Pattern-first thinking** — "this looks like a Lifecycle Pipeline" before you've decomposed the goal. Let the goal tree dictate the shape.
- **Middle work** — tasks that produce partial results finished by the next task. Every task delivers something complete.
- **Missing requirements** — proceeding to contracts without verifying every user requirement maps to a sub-goal.
- **Process decomposition** — verb-named siblings (`fetch → clean → analyze`) that each process the whole population. Re-decompose by entity, each owning its end-to-end result.

### Dynamic Containers vs Static Children

**Prefer static children when the list is known at plan time and N <= 15.** Static children are discovered at compile time by `discoverStaticChildren`, guaranteeing correct execution order: children run before the parent converges, and downstream tasks wait for convergence.

**Use a dynamic container when:**
- The child list is data-driven or discovered while the task runs
- The same child shape repeats and should come from `templates/<name>/TASK.md`
- The parent may need multiple waves before its checks pass
- The task should keep adapting based on files produced so far

## 9. Reference Index

Load these on demand — they stay out of context until needed:

| Reference | When to load |
|---|---|
| `references/model.md` | Goal decomposition, convergence, DAG theory, full principles |
| `references/patterns.md` | Common goal-tree shapes, static/dynamic per shape, mix guidance |
| `references/static-dynamic.md` | Deciding between hand-written tasks and dynamic containers |
| `references/tests.md` | Writing checks that call explicit `scripts/...` helpers |
| `references/phases.md` | Step-by-step execution guide with commands |
| `references/anti-patterns.md` | Full anti-patterns catalog |
| `references/schema.md` | TASK.md / playbook.yml / spawn-template format reference |
| `references/skills.md` | Skill-driven authoring: when to factor a skill, where it lives, Anthropic-compatible SKILL.md format |

## 10. Quick Reference

### Anchor playbooks

| Example | What it shows |
|---|---|
| `examples/baby-app/` | Deep nesting (3 levels): lifecycle → screen domain → sub-layer |
| `tests/test-seeding/` | Runtime task spawning from templates with typed vars |
| `tests/test-waves/` | Single-task multi-wave loop via checks + converge prompt |
| `tests/test-goal-driven/` | Dynamic container that spawns one sprint per wave and halts cleanly |
| `examples/deep-research/` | Template-driven research epochs |
| `examples/cinematic-video-production/` | Domain-first split with runtime fan-out at the shot layer |

### Directory layout

```
.converge/
├── project.yaml
└── playbooks/
    └── default/
        ├── playbook.yml
        ├── PLAN.md                   # Root DAG blueprint
        ├── tasks/                    # Static tasks and container roots
        │   ├── prepare/
        │       ├── TASK.md
        │       └── tasks/
        │           ├── 01-schema/
        │           │   └── TASK.md   # Static child (numeric prefix required)
        │           └── 02-migrate/
        │               └── TASK.md   # Static child (numeric prefix required)
        │   └── build/
        │       └── TASK.md           # Passthrough dynamic container
        ├── templates/                # Spawn templates for runtime children
        │   ├── sprint/
        │   │   └── TASK.md
        │   └── phase/
        │       └── TASK.md
        └── scripts/                  # Reusable helpers invoked directly from checks
            ├── file-exists.sh
            └── backend-configured.js
```

IDs are plain kebab-case slugs. Top-level task directories (and template directories) stay bare; **static-child directories under a parent's `tasks/` subdirectory MUST be prefixed `01-`, `02-`, `03-`** (the runtime's `discoverStaticChildren` matches `^\d{2,3}-`). Order comes from `depends_on` edges, not naming. Checks are explicit `cmd` entries; shared logic lives under `scripts/` and is called directly from the command.

Dynamic work in current Converge shows up in two common shapes:

- **Spawn manifest (preferred)** — a passthrough container body writes a JSONL plan to `$CONVERGE_TASK_DIR/spawn.plan.jsonl` and runs `converge apply $CONVERGE_TASK_DIR/spawn.plan.jsonl`. One JSON object per line, no shell quoting, fields are validated. Per-row failures land in `spawn.plan.result.jsonl` with structured `errorCode`s; the parent's repair check (`grep -q '"ok":false' spawn.plan.result.jsonl` → fail) drives the converge loop until every row is `ok:true`.
- **Pre-rendered TASK.md** — when a body has already materialized a concrete TASK.md and only needs to register it, the legacy `converge spawn task --task-file <path>` shape still works.

### CLI commands a planner uses

Plain reference for the verbs that come up during and after authoring. `converge <cmd> --help` has the full surface; this is the shortlist.

| Command | What it does |
|---|---|
| `converge init` | Scaffold `.converge/project.yaml` + skills. Choose `--backend` (claude / codex / …) and `--provider` (anthropic-oauth / minimax / deepseek / …). |
| `converge add` | Create a playbook in the current project — `--from-example NAME` for built-ins, `--from-github user/repo` for remotes. |
| `converge list` (alias `ls`) | Preview which tasks would run for a given `--select` expression. Use before `run` to confirm the resolved DAG. |
| `converge run` | Execute the convergence loop — dispatch agents, run checks, retry, converge. Optional: `--dry` (preview only), `--resume`, `--fail-fast`, `--select <expr>`. |
| `converge show` | Visualize: `converge show gantt`, `converge show graph`, `converge show journal`, `converge show metrics`. |
| `converge inspect` | Drill into a specific task's checkpoints, convergence graph, and session history. |
| `converge apply <manifest.jsonl>` | Declarative spawn ingest. Emitted *inside* passthrough task bodies. Reads the manifest, validates each row, renders the inventory `TASK.md`, upserts `tasks.jsonl`. Per-row outcomes land in `<manifest>.result.jsonl`. Exit 0 = clean, 3 = any row failed. |
| `converge spawn` (legacy) | Single-row imperative spawn. Prefer `converge apply` for multi-row spawning. |
| `converge tasks mark <id> --status done\|dropped\|blocked` | Used from inside a passthrough body to retire a dynamic container when its stop condition is reached. |
| `converge stop` | Stop an active run and release the lock. |
| `converge clean` | Reset transient state (`target/`, journal, artifacts) — surgical, leaves source files alone. |

### Dynamic container checklist

For a modern autonomous parent task, plan for all of these:

- `passthrough: true`
- a body that writes evidence files and uses `converge spawn ...` idempotently
- templates under `templates/`
- checks that fail until the desired state is actually reached
- a `converge` prompt that decides continue vs halt after each body run
- `converge tasks mark <id> --status done` when the parent knows it is finished

## 11. Related Skills

```
converge-planning              converge-control              repair-control
(what to build)         →     (how to execute)        →    (how to fix)
Goal → Sub-goals →            Run → Debug →                Detect gap →
Contracts → Validate          Plan tasks → Verify          Route strategy →
                                                           Repair
```

Handoff: converge-planning produces `.converge/playbooks/{name}/` structure, then converge-control takes over for execution. PLAN.md describes the delegation structure; the runtime expands it.
