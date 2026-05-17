---
name: converge-planning
description: >-
  Comprehensive playbook planning: analyze the goal, decompose it into
  deliverable tasks, and write a runnable playbook with contracts, checks,
  dynamic work patterns, and skills. Use when starting a fresh project,
  onboarding an existing codebase, or restructuring work into a playbook.
---

# Converge Planning

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
- **Dynamic container** — a passthrough parent emits `converge spawn <id> <template>` commands at runtime, then uses a `converge` post-check loop to decide whether to continue or stop.

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
| **Resources** | `skills:`, `references:`, `vars:` | Tools and data the executor may use |
| **Dependencies** | `depends_on:` | Tasks that must complete first |

A contract is **leaky** when any part is missing, vague, or over-broad. The deliverable is the contract's reason to exist.

> For the full model including DAG semantics, convergence patterns, and the principles in depth, see `references/model.md`.

## 2. The Recipe

To go from "I have a project" to "here's a playbook":

1. **Extract the goal.** One sentence. What complete, usable thing must exist when this is done? Be specific: "A deployed blog with posts, comments, and auth" not "A blog."

2. **List every requirement.** Categorize: must-haves, should-haves, constraints (tech stack, deadlines, compliance), explicit non-goals. Write each as a specific, testable statement. Don't proceed until the list feels exhaustive.

3. **Define acceptance criteria.** How do we know the goal is achieved? One or more concrete, verifiable conditions. "All API endpoints return 2xx and pass integration tests" not "the API works."

4. **Decompose into deliverable sub-goals.** Each sub-goal is a complete, independently verifiable result. 3–7 per level. Name each by what exists when done. If a sub-goal is still too large, recurse.

5. **Verify complete cover.** Map every requirement from step 2 to the sub-goal(s) that fulfill it.
   - Any requirement with no mapping → gap. Add a sub-goal or adjust scope.
   - Any sub-goal with no mapped requirement → scope creep. Remove or justify.
   - The set of sub-goal deliverables together achieve the parent goal.

6. **Stop when leaves are workable.** A leaf is workable when one agent can produce its complete deliverable in one session (~15–45 min). If a deliverable needs multiple sessions, split it further — by sub-feature, by entity, by endpoint, not by workflow stage.

7. **Write contracts.** Only now — for each task, write its TASK.md: title, description, inputs (what it reads), outputs (its complete deliverable), checks (how to verify), depends_on (what must finish first). Then choose the right task shape:
   - leaf → one executable body
   - static container → children under `tasks/`
   - dynamic container → `passthrough` body + `templates/` + `converge spawn ...` + a `converge` post-check contract

8. **Validate every contract.** Every output has a deterministic check. Every input traces to an upstream output. No orphan outputs. Checks return 0/non-zero. See §6 for the full checklist.

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
        │           ├── schema/
        │           │   └── TASK.md   # Static child
        │           └── migrate/
        │               └── TASK.md   # Static child
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

IDs are plain kebab-case slugs. Order comes from `depends_on` edges, not naming. Checks are explicit `cmd` entries; shared logic lives under `scripts/` and is called directly from the command.

Dynamic work in current Converge shows up in two common shapes:

- `templates/<name>/TASK.md` plus `converge spawn <id> <template>` for runtime task registration from a passthrough container body.

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
