# Model Reference

Full model reference for converge-planning. Read when you need to understand goal decomposition, convergence, delegation-contract theory, DAG semantics, or the three principles in depth. For the abbreviated version, see `../SKILL.md`.

---

## The Model: Goal → Deliverable Sub-Goals → Convergence

**A playbook starts with a goal and decomposes into deliverable sub-goals.** The user wants a complete, usable result. If that result is too large for one agent, split it into smaller complete results. Each sub-goal produces its own deliverable. The parent converges those deliverables into the unified whole.

```
USER'S GOAL: "Working payment dashboard"
    │
    ├── Sub-goal A: Database schema + seed data → migration.sql + seed.sql
    ├── Sub-goal B: Payment API endpoints → working API with passing tests
    ├── Sub-goal C: Dashboard UI → rendered dashboard with live data
    └── Sub-goal D: Auth + permissions → login flow with role checks

Each sub-goal produces a complete deliverable. The parent converges them.
```

This pattern is recursive. Sub-goal B ("Payment API") might further split into "POST /charges endpoint," "GET /transactions endpoint," and "Webhook handler" — each a complete, testable deliverable.

### The three phases of execution

**1. Decompose** — The task analyzes its goal and identifies the deliverable sub-goals that together achieve it. It writes a contract for each child: scope, expected deliverable (outputs), checks. The set of children's deliverables must form a **complete cover** of the parent's goal — nothing left unassigned, no overlap.

**2. Execute** — Children produce their deliverables independently. They don't know about each other. Each reads its declared `inputs:`, does its work, produces its declared `outputs:`. Children of the same parent can run in parallel when their `depends_on` edges allow it.

**3. Converge** — The parent gathers children's deliverables, integrates them, and produces the converged result. This is active work, not passive grouping. The parent reads children's files via its own `inputs:`, synthesizes, validates cross-child consistency, and produces its `outputs:` — the integrated deliverable.

**The convergence step is what makes a parent a real task.** A container without convergence is just a folder — it groups children but adds no value. A container with convergence produces something none of its children produce individually: the integrated result.

### Example: three-level goal decomposition

```
Goal A: "Build Dashboard"
├── DECOMPOSE: split into Data Pipeline + UI Components
├── CHILDREN EXECUTE:
│   ├── B: "Data Pipeline"
│   │   ├── DECOMPOSE: split into B1 (raw data) + B2 (clean data)
│   │   ├── B1 produces raw-data.json, B2 produces clean-data.json
│   │   └── CONVERGE: B validates schema, joins, produces data.json
│   └── C: "UI Components"
│       ├── DECOMPOSE: split into C1 (charts) + C2 (tables)
│       ├── C1 produces charts/, C2 produces tables/
│       └── CONVERGE: C validates components, produces components/
└── CONVERGE: A reads data.json + components/, assembles dashboard,
    validates integration (data binds to UI), produces dashboard/
```

A's `outputs:` is `dashboard/` — the converged dashboard. B's `outputs:` is `data.json` — the converged data. C's `outputs:` is `components/` — the converged UI. Each level adds value through convergence.

### Why convergence matters

- **Integration bugs surface at the right level.** If B's data doesn't bind to C's charts, A's convergence check catches it — not the user.
- **The DAG encodes real dependencies.** A depends on B *because* A's convergence reads B's output. The edge has semantic meaning.
- **Re-running is surgical.** If B1 fails, re-run B's subtree (B1 → B2 → B converge). C is untouched.
- **Each level can be validated independently.** B's convergence check validates the data pipeline in isolation. A's convergence check validates the integration.

**The TASK.md body is the converge prompt.** Decomposition is handled by `seed: { mode: cli }` tasks or static children. The body contains only convergence instructions — what to read, how to integrate, what to validate. It runs after children complete.

---

## The Delegation Contract

The division-convergence model is implemented through delegation contracts. **A TASK.md is the contract for one node's division, execution, and convergence.**

A parent owns the larger problem; children own bounded sub-problems the parent has handed off. Each task is **self-contained** — its `TASK.md` fully specifies the contract: scope, inputs, outputs, acceptance checks. Like a company: a director owns "ship the product" and delegates to a team lead, who delegates to an engineer, who delegates to a junior. At every level the work is bounded, specified, and accepted by checks. Nobody upstream micromanages downstream; nobody downstream second-guesses the parent's choice of sub-scopes.

Every `TASK.md` has six contract parts:

| Contract part | TASK.md field | What it specifies |
|---|---|---|
| **Scope** | `title` + `description` + body | The bounded problem this task owns — includes both division logic and convergence logic |
| **Inputs** (Context In) | `inputs:` | Files the executor reads — children's outputs (for convergence) and upstream data |
| **Outputs** (Context Out) | `outputs:` | Files the executor produces — the *converged* result for this level |
| **Acceptance** | `checks:` | Deterministic predicates that decide done/not-done — must include convergence validation |
| **Resources** | `skills:`, `references:`, `vars:` | Tools and data the executor may use |
| **Dependencies** | `depends_on:` | Tasks that must complete first — children, upstream siblings |

A contract is **leaky** when any part is missing, vague, or over-broad. Leaky contracts break the chain: the executor either can't complete the work or has to read outside its scope.

### The convergence handshake

```
Parent declares in its TASK.md:
  depends_on: [B, C]           # "I need these before I can converge"
  inputs:                       # "I'll read these to converge"
    - B/data.json
    - C/components/

Child B declares in its TASK.md:
  outputs:                      # "I'll produce this for my parent"
    - B/data.json

Child C declares in its TASK.md:
  outputs:
    - C/components/
```

The file paths are the handshake. Parent says "I expect these files." Children say "I produce these files." When paths match, the DAG edge is wired. When they don't, it's a leaky contract.

### Containers: division + convergence, not just grouping

A container task's body has two sections:

1. **Division instructions** — how to split the scope into children. What each child owns. What seed template to use. What data drives the division.
2. **Convergence instructions** — after children complete, how to integrate their outputs. What to validate across children. What the converged output looks like.

A container without convergence instructions is a red flag. Ask: *what does this container produce that none of its children produce individually?* If the answer is "nothing," collapse it.

### Decompose scope, not process

**A task is a contract of *result*, not a contract of *process*.** The scope is *what exists when this is done*, expressed as `outputs:` + `checks:`. The body says how to do the work, but the contract doesn't bind the executor to specific steps — only to the result.

When you split a parent into children, you're splitting *the result* into smaller results, each owned by one child. You are **not** splitting "the workflow we run to produce the result" into stages.

| Process decomposition (wrong) | Scope decomposition (right) |
|---|---|
| `001-spec`, `002-author`, `003-prompts`, `004-concepts` — the four stages of a per-token pipeline, each operating on *all tokens* | `001-catalog` writes `tokens-catalog.json`; `002-craft` is a seed that, for each entry, runs the per-token pipeline and produces `{token.md, prompt.md, concept.png}` |
| `001-fetch-data`, `002-clean-data`, `003-analyze-data` — three stages over the same dataset | `001-build-dataset` produces `dataset.parquet` (cleaned); `002-report` produces `report.md` from it |
| `001-design`, `002-implement`, `003-test` per feature, repeated across N features | `001-spec` lists the N features; `002-deliver` is a seed per feature, each owning its own design→build→test internally |

**The diagnostic — three questions to ask of any sibling set:**

1. **Are the names verbs or nouns?** Process stages are verbs (*author*, *fetch*, *clean*, *implement*). Scope chunks are nouns (*catalog*, *dataset*, *feature-X*). Verbs are a smell.
2. **Does each child produce a *complete* result, or a partial product the next stage finishes?** If child N's outputs are inputs to child N+1 over the same population, you've sliced the workflow horizontally — that's process. Scope decomposition slices the *population* (per-token, per-feature, per-scene); each child owns one slice end-to-end.
3. **What does failure look like?** Process: stage 3 fails on the 17th item, the whole stage retries. Scope: the 17th-item task fails, the other 16 stand. Re-running is just re-running that one task.

Why scope wins:

- **Failures are small.** A seed-spawned child for one token re-runs in isolation; a bulk-stage task retries every token because the contract says "every token."
- **Cost is visible.** Each scope-child's cost is its own line in the journal. Process-stages aggregate cost across the whole population — you see it after the fact.
- **The contract is closed.** A scope-child's `outputs:` are *its* deliverables. A process-stage's outputs are intermediate goo the next stage consumes — the contract leaks across the seam.
- **Parallelism is implicit.** Per-entity scope children run in parallel for free. Process stages serialize.

If a child's name reads "the part of the workflow where we ___", rewrite it. The right name reads "the ___ that exists when this is done."

The body of a task can still describe *how* to produce the result (which scripts, which order, which APIs). That's executor guidance, not the contract. The contract is the `outputs:` + `checks:` line.

### Files are the contract currency

**Tasks pass work through files, not through TASK.md bodies.** A `TASK.md` contains *instructions only* — the scope, the references, the checks. The actual work product — specs, designs, code, data, reports — lives in files declared under `outputs:`, and downstream tasks (including the parent's convergence step) consume them via `inputs:`. The contract is the only thing inlined; everything else is a file path.

| Goes inline in TASK.md | Goes in a file |
|---|---|
| Scope, instructions, acceptance criteria | Specs, requirements, designs |
| Skill references, tool names | Code, data, configs |
| Short literal vars (≤ 10 lines) | Anything ≥ 10 lines, anything reused, anything structured |

Why it matters:

- **Convergence only works if children's outputs are files.** The parent's convergence step reads files, not prompts. If a child's result lives only in its execution trace, the parent can't converge it.
- **Delegation only works if the work product is portable.** If task B needs task A's spec, A writes the spec to a file; B reads it. Stuffing the spec into B's prompt couples B to A's wording and bloats context.
- **Self-containment is verifiable.** "Can this executor complete the work given only TASK.md + declared inputs?" is answerable when work flows through files. It's not when context leaks via shared prompts.
- **Format matches use.** Markdown for specs and instructions humans read; JSON for structured data machines parse; JSONL for append-only event streams.

**Rule of thumb:** if you're tempted to paste content into a TASK.md body that another task will need, you've found a missing artifact. Have the producing task write a file; declare it as an `output:`; have the consumer declare it as an `input:`. The TASK.md body is for *how to do the work*, not *what to do it with*.

### Not middle work

**Every task output must be a complete, usable deliverable.** This is the most expensive rule to violate. Middle work — partial results that the next task finishes — breaks the contract chain and makes verification impossible at the task level.

**The diagnostic — three questions for every task:**

1. **"Can someone use this output directly?"** If the output is instructions, plans, specs, or partial work that needs further processing before it's usable — it's middle work. The task isn't done.
2. **"Does the next task finish this output, or consume it?"** If *finish* (the next task continues building the same thing) → middle work. Decompose into two complete deliverables instead. If *consume* (reads it as a complete input to produce its own distinct deliverable) → correct.
3. **"Is this a complete thing that exists, or a stage of producing a thing?"** If *stage* → middle work. The right decomposition splits the *population* (per-entity, per-endpoint, per-feature), each owning its end-to-end result.

**Examples:**

| Middle work (wrong) | Complete deliverable (right) |
|---|---|
| `design-database` → `implement-database` — design is a stage, implementation finishes it | `database-schema` produces migration.sql + seed.sql (complete, runnable) |
| `spec-api` → `build-api` — spec is a stage, build finishes it | `charges-endpoint` produces working endpoint with passing tests |
| `prepare-project` — installs deps, creates folders (not usable) | `project-skeleton` produces runnable app with health-check endpoint |
| `analyze-codebase` — produces analysis.md (planning artifact) | Not a task at all — research the AI does while planning |

**The golden rule:** if you can't hand the output to a user and they can use it, the task isn't done. Split differently.

**Middle work vs. convergence:** A parent converging children's deliverables is *not* middle work — the children produced complete deliverables, and the parent produces a new complete deliverable (the integration). The key distinction: children's outputs are complete on their own; convergence adds integration value, not completion value.

### Requirement coverage

**Before writing any contract, verify every user requirement maps to at least one sub-goal.** Missing requirements are the second most expensive mistake after middle work.

**The process:**

1. **List every requirement** extracted from the user's prompt and discovery. Number them (R1, R2, R3...). Be specific: "Users can reset their password via email link" not "auth features."
2. **Map each requirement to sub-goal(s).** For each requirement, identify which sub-goal's deliverable fulfills it. One requirement may map to multiple sub-goals. One sub-goal may fulfill multiple requirements.
3. **Flag gaps.** A requirement with zero mappings → missing sub-goal. Add one or adjust an existing sub-goal's scope.
4. **Flag creep.** A sub-goal with zero mapped requirements → it doesn't serve the user's goal. Remove it or explicitly justify why it's necessary infrastructure (e.g., "CI/CD setup" even if not explicitly requested).
5. **Check the union.** Reading all sub-goal deliverables together, would a user say "yes, that's what I asked for"? If not, what's missing?

**Example:**

```
User goal: "Blog with comments and RSS feed"

Requirements:
  R1: Author can write and publish posts
  R2: Readers can leave comments on posts
  R3: RSS feed of published posts
  R4: Posts support markdown formatting
  R5: Mobile-responsive design

Sub-goal mapping:
  A: "Post CRUD + publishing" → R1, R4
  B: "Comment system"        → R2
  C: "RSS feed endpoint"     → R3
  D: "Responsive layout"     → R5
  E: "Database + auth"       → (infrastructure, serves A, B)

  R1 ✓  R2 ✓  R3 ✓  R4 ✓  R5 ✓  — full coverage
  E has no direct requirement → justified as shared infrastructure
```

This check takes 2 minutes. It catches the gaps that cause rework downstream.

### Playbook is reusable; artifacts are per project

**A playbook is a tree of `TASK.md` + `seeds/` that ships in source control. It says *how* to do this kind of work. Artifacts — the work product — are per project and live at the project root, not inside the playbook.** Two projects can run the same playbook and produce wildly different artifacts.

| Reusable (lives in the playbook) | Per-project (lives in the project) |
|---|---|
| `playbook.yml` — manifest | `idea.md`, `PRD.md` — what *this* project wants |
| `TASK.md` — contract instructions | `screens.json`, `entities.json` — *this* project's data |
| `seeds/index.js`, `seeds/templates/` — replication logic | Generated code, designs, configs |
| Skills, references | Final deliverables, build outputs |

**Anchor:** `examples/baby-app/` — the playbook lives at `.converge/playbooks/default/`; the artifacts live at the project root. Drop a different `idea.md` into a new project and run the same playbook.

**Test for drift:** if you can't copy the playbook into a new empty project and run it (after dropping in a fresh `idea.md`), you've baked project-specific data into the playbook. Move it out to a project file.

---

## The DAG Model

**A playbook is a DAG.** Every task is a node. Every `depends_on` in `playbook.yml` and `dependencies` in `TASK.md` is a directed edge. The framework computes topological order from those edges — directory sort prefixes (`01-`, `002-`) are for human readability, not execution order.

In the division-convergence model, DAG edges have clear semantics:
- **Parent → child edges** are the division: parent spawns children, depends on them to complete before converging.
- **Sibling → sibling edges** are sequential constraints within a level: "C needs B's output before C can start."
- **Child → parent (implicit)** is the convergence: children complete, parent converges. This edge isn't declared by the child — it's implied by the parent's `depends_on:` listing its children.

**Declarative, not imperative.** A task declares *what it produces* (`outputs:`) and *what it needs* (`inputs:`, `depends_on:`). It does not declare *when it runs* — the framework resolves that from the DAG. This is the same mental model as dbt's `ref()`: you name what you depend on, and the tool figures out the rest.

**The manifest is the compiled DAG.** Planning produces the source files (the `TASK.md` tree). `converge compile` produces `target/manifest.json` — the single source of truth for what nodes exist and how they connect.

**Selection operates on the DAG.** `--select '03-tokens+'` means "this node and all descendants." `--select 'state:modified+'` means "what changed and everything downstream."

**Three implications for planning:**

1. **Declare every edge.** A task's `depends_on:` list is the definitive record of what must complete first — including its own children for convergence.
2. **Outputs trace to downstream inputs (or to parent).** Every `outputs:` entry is consumed either by a sibling downstream or by the parent's convergence step. Orphan outputs signal a missing consumer.
3. **The DAG is partly dynamic.** seed lets a parent spawn children at runtime. Plan for what's knowable; mark what isn't.

---

## Three Principles (Full Exposition)

### Principle 1 — Nested over flat (separation of concerns)

A parent owns one concern; children own sub-concerns. Each level's convergence addresses one integration concern. Flat trees collapse the org chart — the root ends up doing everyone's job.

- Top-level: **3–7 phases**. Each is one concern the project owner holds.
- Each phase: **3–7 children**. Each is one sub-concern the phase delegates.
- Continue nesting until each leaf is **15–45 min** of self-contained work.
- At each level, the convergence step integrates that level's concern.

**Anchor:** `examples/baby-app/.converge/playbooks/default/tasks/03-build-screens/` — three levels (phase → per-screen → per-sub-layer) instead of 80 sibling tasks.

**Smells:**
- *One-child node* → no division happening. Collapse into parent.
- *Mixed-shape siblings* (one config task next to ten per-screen tasks) → multiple concerns leaked into one parent. Split.
- *Verb-named siblings* (`author`, `fetch`, `clean`, `implement`, `test`) → you've decomposed the workflow, not the scope. Re-decompose by *what exists* — usually one child per entity, each owning its own end-to-end mini-workflow internally.
- *No convergence step in a container* → the parent adds no value. Either add convergence or flatten.

### Principle 2 — seed for replicable work (one contract, N instances)

When the same contract shape repeats from data, write the contract **once** as a seed template. The runtime spawns instances.

**Use seed when:**
- N similar children driven by a list (`screens.json`, `entities[]`, `shots[]`).
- N is data-driven and may grow.
- Each instance has the same input/output shape — only the data binding differs.

**Don't use seed when:**
- One-off tasks (single config, one spec).
- Heterogeneous shapes (different inputs, outputs, or skills) — those are *different* contracts; hand-write them.
- Small fixed N (≤ 3) where hand-writing is clearer.

Even with seeds, the parent's convergence step is explicit: "after all N instances produce their outputs, I integrate them."

**Anchor:** `examples/stitch-to-flutter-baby-watch-v2/` — one template drives 10 screens; the parent converges the screens into the app.

Seed API: see `schema.md` § seed API.

### Principle 3 — Progressive decomposition by domain × layer (delegation discipline)

Plan one layer at a time. Write contracts only for your **direct children**. Never reach into grandchildren — that's each child's job when invoked.

Split each layer two ways:

| Split by | What it produces | Example |
|----------|------------------|---------|
| **Lifecycle layer** | Top-level phases | `01-prepare → 02-design-system → 03-build-screens → 05-behavior → 06-wire → 07-overlays` |
| **Domain** | Children inside a phase | inside `03-build-screens/`: one child per screen (`001-home`, `002-cycle-tracking`, …) |
| **Sub-layer** | Grandchildren inside a domain | inside `001-home/`: `001-design`, `002-build`, `003-split`, `004-lift` |

Lifecycle gives the *order* of division; domain gives the *fan-out* (who gets which slice).

At each layer, the parent's convergence integrates what that layer divided. The phase-level parent converges the phase; the domain-level parent converges the domain.

**Anchor:** `examples/baby-app/.converge/playbooks/default/tasks/` — top-level by lifecycle, second by screen domain, third by sub-layer.

**Hard rule:** when invoked at a node, plan only its direct children. Never read siblings, cousins, or grandchildren. If something's missing from your scope, write it under "Open questions" in PLAN.md — *don't fix under-specification by reaching outside your scope.*
