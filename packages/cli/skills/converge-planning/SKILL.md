---
name: converge-planning
description: >-
  Comprehensive upfront project planning: analyze, discover, architect, and
  validate playbooks. Use when starting a fresh project, onboarding an existing
  codebase, or creating a full contract tree with tasks, seeds, checks, and
  skills. Produces `.converge/playbooks/` structure for converge-control.
---

# Converge Planning

## 1. Core Mental Model

**A playbook is a chain of division and convergence.** Every task too large for one step divides into smaller tasks, those execute independently, then the task converges their results back into a unified whole.

The pattern repeats at every level:

```
DIVIDE              EXECUTE              CONVERGE
Task A          B runs ─────┐        A reads B's outputs
splits into  →  independently  →   + C's outputs, integrates,
B and C         C runs ─────┘        validates combined result
```

**Example:** Task A ("Build Dashboard") divides into B ("Data Pipeline") and C ("UI Components"). B produces `data.json`; C produces `components/`. After both complete, A converges — reads `data.json`, scans `components/`, assembles the dashboard, validates the integration. A's output isn't just "B and C ran" — it's a verified, integrated dashboard.

This is **recursive**. B might itself divide into B1 and B2, converge their results, and hand a clean `data.json` up to A. Every node in the tree follows the same rhythm: divide, let children execute, converge.

**The TASK.md body is the converge prompt.** Division is handled by the seed script or static children. The body contains only convergence instructions: what children's files to read, how to integrate them, how to validate the combined result. The body runs after all children complete.

**The converge step is what makes a parent a real task, not just a folder.** If the parent has no body, it's just grouping — children run independently but the parent adds no integration value. A body adds value: cross-child validation, assembly, integration. The parent's `outputs:` are the *converged* result — not the children's raw outputs, but what the parent produces from them.

Every `TASK.md` has six contract parts:

| Contract part | TASK.md field | What it specifies |
|---|---|---|
| **Scope** | `title` + `description` + body | The bounded problem this task owns (including convergence) |
| **Inputs** | `inputs:` | Files the executor reads — children's outputs, upstream data |
| **Outputs** | `outputs:` | Files this task produces — the *converged* result |
| **Acceptance** | `checks:` | Deterministic predicates that decide done/not-done |
| **Resources** | `skills:`, `references:`, `vars:` | Tools and data the executor may use |
| **Dependencies** | `depends_on:` | Tasks that must complete first (children, upstream) |

A contract is **leaky** when any part is missing, vague, or over-broad.

**Files are the currency of convergence.** Children pass results to their parent through files declared in `outputs:`. The parent's convergence step reads those files via `inputs:` — the same paths declared when the work was divided. This is the handshake: parent says "I expect these files," children say "I produce these files."

**Decompose scope, not process.** Split the *result* into smaller results, not the workflow into stages. Verb-named siblings (`fetch → clean → analyze`) are a smell — decompose by *what exists when done*, usually one entity per child owning its end-to-end mini-workflow.

**Playbook is reusable; artifacts are per project.** The playbook says *how* to do this kind of work. Project-specific data lives at the project root, not in playbook files.

> For the full model including DAG semantics, convergence patterns, scope decomposition rules, and the three principles in depth, see `references/model.md`.

## 2. The Recipe

To go from "I have a project" to "here's a playbook":

1. **Frame the top-level scope.** What is the project's single concern? One sentence.
2. **Pick a delegation pattern.** Use the picker in §3. Adapt — don't copy.
3. **Identify the layers.** Lifecycle phases, domain entities, or epoch template — whatever the pattern prescribes.
4. **Identify the next-level fan-out.** Inside each layer, what entities replicate? What sub-layers does each pass through?
5. **Mark replication points.** Wherever the same shape repeats from data, that's a seed template.
6. **Decide static vs. dynamic.** ≤ 7 known items → static subtasks. Data-driven list → catalog + seed (*expected*). Truly unknown → seed only (*frontier*).
7. **Design the convergence at each level.** For every container task, specify what the convergence step does: what children's files it reads, how it integrates them, what the converged output looks like, and how to validate the integration. A container without a convergence step is just a folder — it adds no value.
8. **Write contracts top-down, one layer at a time.** At each node, write only your direct children's `TASK.md`. Each child's contract declares the `outputs:` the parent will converge. Children's own division is written when they execute.
9. **Write tests alongside contracts.** Every output gets at least one check. Containers get convergence checks — cross-child consistency, integration validation. Tag by cost (`fast`/`slow`).
10. **Validate every contract.** See §6.

The convergence step is the heart of the design. Ask at every division point: *what does this parent produce that none of its children produce individually?* If the answer is "nothing," the parent shouldn't exist — flatten it.

You don't need to invent layers from scratch. Skim the anchor examples for the closest fit and adapt.

> For detailed phase-by-phase instructions with commands, see `references/phases.md`.

## 3. Pattern Picker

Most projects fit one of five recurring delegation shapes. Two questions decide:

1. **Is there a list of N similar entities the project must deliver?** (screens, characters, shots, scenes)
   - Delivered *in parallel* → **Domain Layering**
   - Delivered *inside* an ordered stage → **Lifecycle Pipeline** with seed at that stage
   - If no, skip to question 2.
2. **Does work refine over rounds, or flow once through stages?**
   - Refines over rounds → **Epoch Loop**
   - Flows once, deterministic, no fan-out → **Process Pipeline**
   - Flows once, creative stages with late asset fan-out → **Creative Workflow**

| Pattern | Root delegates by | seed sits at | Anchor |
|---|---|---|---|
| **Lifecycle Pipeline** | Lifecycle phase (prepare → build → wire) | Per-entity inside a phase | `baby-app`, `flutter-app` |
| **Process Pipeline** | Functional stage (fetch → transform → report) | Rarely — leaves are atomic | `data-pipeline` |
| **Creative Workflow** | Creative stage (story → cast → style → storyboard) | Late-stage per-asset | `cinematic-video-production` |
| **Domain Layering** | Domain entity (characters, scenes, props) | Per-entity at every domain | `game-assets-video` |
| **Epoch Loop** | Epoch iteration (fixed template repeated) | Epoch itself is a seed | `scientific-research`, `frontier-research` |

> For full pattern descriptions including shapes, static/dynamic behavior, test notes, and mix guidance, see `references/patterns.md`.
> For the static vs. dynamic decision heuristic, see `references/static-dynamic.md`.

## 4. Three Principles

1. **Nested over flat** — A parent owns one concern; children own sub-concerns. 3–7 children per node. Smells: one-child node, mixed-shape siblings, verb-named siblings.
2. **seed for replicable work** — One contract template, N instances. Use when the list is data-driven or N > 7. Don't hand-write near-copies.
3. **Progressive decomposition by domain × layer** — Plan one layer at a time. Write contracts only for your direct children. Never read grandchildren.

> For the full exposition with anchor examples and smells, see `references/model.md`.

## 5. Phase Guide

```
Phase 1 ANALYZE  → .converge/analysis.md       (codebase scan — skip if fresh)
Phase 2 DISCOVER → .converge/requirements.md   (user needs — skip if prompt is specific)
Phase 3 ARCHITECT → playbook.yml + tasks/      (write top-level contracts only)
Phase 4 VALIDATE  → approved plan              (contract review gate)
```

- **Phase 1 — Analyze**: Scan `package.json`, directory structure, git log, existing `.converge/`. Capture tech stack, conventions, state.
- **Phase 2 — Discover**: Ask about vision, core features (3–5 ranked), user flows, data/APIs, constraints. Capture as specific, measurable facts.
- **Phase 3 — Architect**: Apply the recipe. Write top-level phase TASK.md files + PLAN.md blueprints + playbook.yml with `depends_on` edges. You write **only** top-level contracts.
- **Phase 4 — Validate**: Run the contract review checklist (§6) on every contract. A failed validation is a leaky contract — tighten it.

> For detailed phase instructions with all commands and PLAN.md blueprint format, see `references/phases.md`.

## 6. Validate (Contract Review)

For every `TASK.md`, check:

- **Bounded scope.** Title is one sentence. Body is concrete.
- **Sharp inputs.** Every `input` traces to an upstream `output`. No orphans. No `src/**/*` globs.
- **Specific outputs.** Specific paths, not "various files."
- **Result-named, not process-named.** `outputs:` describe a result that exists — not a stage of work. Verb-named siblings signal process decomposition.
- **Deterministic checks.** Every output has at least one check. Checks return 0 / non-zero. No string matching.
- **Self-contained.** An executor reading only this `TASK.md` and its declared inputs can complete the work.
- **Body is instructions only.** No work product pasted into the body — specs, designs, data live in declared files.
- **Acyclic deps.** No cycles. Deps are minimal — only what's actually consumed.

**DAG-level checks:**

- **Edges are explicit.** Every dependency is declared via `depends_on:`. No task relies on sort-order alone.
- **Static/dynamic choice is justified.** > 7 children use seed (or explain why not). Catalog upstream → *expected*, not *frontier*.
- **Tests cover the DAG.** Every output has a check. Containers have cross-child consistency checks. Cross-task invariants have playbook-level checks. Tests tagged by cost.
- **Frontiers are honest.** Seed parents without a catalog are acknowledged as *frontier*. No pretending a frontier is concrete.
- **Outputs trace to inputs.** Every `outputs:` entry is consumed downstream or is a terminal deliverable. No orphan outputs.

For container tasks, also check that children form a complete cover of the parent's scope — every commitment in `outputs` is delivered by some child.

When validation passes, the plan is ready for `converge run`.

## 7. Anti-Patterns

Common pitfalls: flat 30-task playbooks, process-stage decomposition, orphan inputs, reaching into grandchildren, hard-coding project data into playbooks, no checks on tasks. If validation flags a pattern, see `references/anti-patterns.md` for the full catalog.

## 8. Reference Index

Load these on demand — they stay out of context until needed:

| Reference | When to load |
|---|---|
| `references/model.md` | Division-convergence model, DAG theory, scope decomposition, full principles |
| `references/patterns.md` | Pattern shapes, static/dynamic per pattern, mix guidance |
| `references/static-dynamic.md` | Deciding between hand-written tasks and seed templates |
| `references/tests.md` | Writing checks, defining reusable `.test.md` files |
| `references/phases.md` | Phase-by-phase instructions with commands |
| `references/anti-patterns.md` | Full anti-patterns catalog |
| `references/schema.md` | TASK.md / playbook.yml / seed API format reference |

## 9. Quick Reference

### Anchor playbooks

| Example | What it shows |
|---|---|
| `examples/baby-app/` | Deep nesting (3 levels): lifecycle → screen domain → sub-layer |
| `examples/stitch-to-flutter-baby-watch-v2/` | seed templates for per-screen replication |
| `examples/deep-research/` | seed at every layer; templates for research epochs |
| `examples/cinematic-video-production/` | Domain-first split with seed at per-shot/per-sheet layer |

### Directory layout

```
.converge/
├── project.yml
└── playbooks/
    └── default/
        ├── playbook.yml
        ├── PLAN.md                   # Root DAG blueprint
        ├── tasks/                    # Static contracts only
        │   ├── prepare/
        │   │   ├── TASK.md           # Container contract
        │   │   ├── PLAN.md           # Delegation blueprint
        │   │   └── catalog/
        │   │       └── TASK.md       # Leaf executable
        │   └── wire/
        │       ├── TASK.md
        │       └── PLAN.md
        ├── tests/                    # Reusable check definitions
        │   ├── file-exists/
        │   │   ├── index.test.md
        │   │   └── index.js
        │   └── backend-configured/
        │       ├── index.test.md
        │       └── index.js
        └── seeds/                    # Dynamic contracts (data-driven fan-out)
            ├── build-screens/
            │   ├── SEED.md
            │   └── index.js
            └── per-character/
                ├── SEED.md
                └── index.js
```

IDs are plain kebab-case slugs. Order comes from `depends_on` edges, not naming. Tests live in `tests/` — reusable `.test.md` definitions referenced by `name:` with `type: test`.

## 10. Related Skills

```
converge-planning              converge-control              repair-control
(what to build)         →     (how to execute)        →    (how to fix)
Analyze → Discover →          Run → Debug →                Detect gap →
Architect → Validate          Plan tasks → Verify          Route strategy →
                                                           Repair
```

Handoff: converge-planning produces `.converge/playbooks/{name}/` structure, then converge-control takes over for execution. PLAN.md describes the delegation structure; the runtime expands it.
