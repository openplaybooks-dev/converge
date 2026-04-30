---
name: converge-planning
description: Use when starting a fresh project, onboarding an existing codebase, or creating a comprehensive project plan with tasks, WBS, facts, checks, and skills
---

# Converge Planning

## 1. The Model

**A task is a delegation contract for a scope of work.**

A parent owns the larger problem; children own bounded sub-problems the parent has handed off. Each task is **self-contained** — its `TASK.md` fully specifies the contract: scope, inputs, outputs, acceptance checks. Like a company: a director owns "ship the product" and delegates to a team lead, who delegates to an engineer, who delegates to a junior. At every level the work is bounded, specified, and accepted by checks. Nobody upstream micromanages downstream; nobody downstream second-guesses the parent's choice of sub-scopes.

Every `TASK.md` has six contract parts:

| Contract part | TASK.md field | What it specifies |
|---|---|---|
| **Scope** | `title` + `description` + body | The bounded problem this task owns |
| **Inputs** (Context In) | `inputs:` | Files the executor reads — produced by upstream tasks |
| **Outputs** (Context Out) | `outputs:` | Files the executor produces — consumed downstream |
| **Acceptance** | `checks:` | Deterministic predicates that decide done/not-done |
| **Resources** | `skills:`, `references:`, `vars:` | Tools and data the executor may use |
| **Dependencies** | `dependencies:` | Sibling/cross-branch tasks this contract needs |

A contract is **leaky** when any part is missing, vague, or over-broad. Leaky contracts break delegation: the executor either can't complete the work or has to read outside its scope to figure things out. Validation (§7) is contract review.

### Decompose scope, not process

**A task is a contract of *result*, not a contract of *process*.** The scope is *what exists when this is done*, expressed as `outputs:` + `checks:`. The body says how to do the work, but the contract doesn't bind the executor to specific steps — only to the result.

When you split a parent into children, you're splitting *the result* into smaller results, each owned by one child. You are **not** splitting "the workflow we run to produce the result" into stages.

| Process decomposition (wrong) | Scope decomposition (right) |
|---|---|
| `001-spec`, `002-author`, `003-prompts`, `004-concepts` — the four stages of a per-token pipeline, each operating on *all tokens* | `001-catalog` writes `tokens-catalog.json`; `002-craft` is a WBS that, for each entry, runs the per-token pipeline and produces `{token.md, prompt.md, concept.png}` |
| `001-fetch-data`, `002-clean-data`, `003-analyze-data` — three stages over the same dataset | `001-build-dataset` produces `dataset.parquet` (cleaned); `002-report` produces `report.md` from it |
| `001-design`, `002-implement`, `003-test` per feature, repeated across N features | `001-spec` lists the N features; `002-deliver` is a WBS per feature, each owning its own design→build→test internally |

**The diagnostic — three questions to ask of any sibling set:**

1. **Are the names verbs or nouns?** Process stages are verbs (*author*, *fetch*, *clean*, *implement*). Scope chunks are nouns (*catalog*, *dataset*, *feature-X*). Verbs are a smell.
2. **Does each child produce a *complete* result, or a partial product the next stage finishes?** If child N's outputs are inputs to child N+1 over the same population, you've sliced the workflow horizontally — that's process. Scope decomposition slices the *population* (per-token, per-feature, per-scene); each child owns one slice end-to-end.
3. **What does failure look like?** Process: stage 3 fails on the 17th item, the whole stage retries. Scope: the 17th-item task fails, the other 16 stand. Re-running is just re-running that one task.

Why scope wins:

- **Failures are small.** A WBS-spawned child for one token re-runs in isolation; a bulk-stage task retries every token because the contract says "every token."
- **Cost is visible.** Each scope-child's cost is its own line in the journal. Process-stages aggregate cost across the whole population — you see it after the fact.
- **The contract is closed.** A scope-child's `outputs:` are *its* deliverables. A process-stage's outputs are intermediate goo the next stage consumes — the contract leaks across the seam.
- **Parallelism is implicit.** Per-entity scope children run in parallel for free. Process stages serialize.

If a child's name reads "the part of the workflow where we ___", rewrite it. The right name reads "the ___ that exists when this is done."

The body of a task can still describe *how* to produce the result (which scripts, which order, which APIs). That's executor guidance, not the contract. The contract is the `outputs:` + `checks:` line.

### Files are the contract currency

**Tasks pass work through files, not through TASK.md bodies.** A `TASK.md` contains *instructions only* — the scope, the references, the checks. The actual work product — specs, designs, code, data, reports — lives in files declared under `outputs:`, and downstream tasks consume them via `inputs:`. The contract is the only thing inlined; everything else is a file path.

| Goes inline in TASK.md | Goes in a file |
|---|---|
| Scope, instructions, acceptance criteria | Specs, requirements, designs |
| Skill references, tool names | Code, data, configs |
| Short literal vars (≤ 10 lines) | Anything ≥ 10 lines, anything reused, anything structured |

Why it matters:

- **Delegation only works if the work product is portable.** If task B needs task A's spec, A writes the spec to a file; B reads it. Stuffing the spec into B's prompt couples B to A's wording and bloats context.
- **Self-containment is verifiable.** "Can this executor complete the work given only TASK.md + declared inputs?" is answerable when work flows through files. It's not when context leaks via shared prompts.
- **Format matches use.** Markdown for specs and instructions humans read; JSON for structured data machines parse; JSONL for append-only event streams. Picking the wrong format (e.g. structured data in markdown) makes the file unusable downstream.

**Rule of thumb:** if you're tempted to paste content into a TASK.md body that another task will need, you've found a missing artifact. Have the producing task write a file; declare it as an `output:`; have the consumer declare it as an `input:`. The TASK.md body is for *how to do the work*, not *what to do it with*.

This is what makes `inputs:` / `outputs:` real contract terms rather than documentation: the runtime tracks them, the validator checks they trace upstream, and a missing artifact surfaces as a typed gap rather than a silent failure.

### Playbook is reusable; artifacts are per project

**A playbook is a tree of `TASK.md` + `wbs/` that ships in source control. It says *how* to do this kind of work. Artifacts — the work product — are per project and live at the project root, not inside the playbook.** Two projects can run the same playbook and produce wildly different artifacts.

| Reusable (lives in the playbook) | Per-project (lives in the project) |
|---|---|
| `playbook.yml` — manifest | `idea.md`, `PRD.md` — what *this* project wants |
| `TASK.md` — contract instructions | `screens.json`, `entities.json` — *this* project's data |
| `wbs/index.js`, `wbs/templates/` — replication logic | Generated code, designs, configs |
| Skills, references | Final deliverables, build outputs |

Why it matters:

- **The playbook is a *kind of work*, not a *specific output*.** A "Flutter app from screen spec" playbook should plan any Flutter app; the project's `idea.md` and `screens.json` decide which one.
- **It tells you what to externalize.** Project-specific values (`appName`, brand colors, screen lists) belong in project files the WBS reads — not hard-coded into a TASK.md body or `vars:`.
- **It explains why WBS templates beat hand-written copies.** A hand-written child binds project-specific data into the playbook; a WBS template reads it from a project file at runtime.

**Anchor:** `examples/baby-app/` — the playbook lives at `.converge/playbooks/default/`; the artifacts (`PRD.md`, `idea.md`, `data-models.md`, `.stitch/screens.json`) live at the project root. Drop a different `idea.md` into a new project and run the same playbook.

**Test for drift:** if you can't copy the playbook into a new empty project and run it (after dropping in a fresh `idea.md`), you've baked project-specific data into the playbook. Move it out to a project file.

Schema details: see `SCHEMA.md`.

---

## 2. Three Principles

Everything else falls out of the model.

### Principle 1 — Nested over flat (separation of concerns)

A parent owns one concern; children own sub-concerns. Flat trees collapse the org chart — the root ends up doing everyone's job.

- Top-level: **3–7 phases**. Each is one concern the project owner holds.
- Each phase: **3–7 children**. Each is one sub-concern the phase delegates.
- Continue nesting until each leaf is **15–45 min** of self-contained work.

**Anchor:** `examples/baby-app/.converge/playbooks/default/tasks/03-build-screens/` — three levels (phase → per-screen → per-sub-layer) instead of 80 sibling tasks.

**Smells:**
- *One-child node* → no delegation happening. Collapse into parent.
- *Mixed-shape siblings* (one config task next to ten per-screen tasks) → multiple concerns leaked into one parent. Split.
- *Verb-named siblings* (`author`, `fetch`, `clean`, `implement`, `test`) → you've decomposed the workflow, not the scope. The same population threads through every stage; failure mid-stage retries the whole stage. Re-decompose by *what exists* — usually one child per entity, each owning its own end-to-end mini-workflow internally. See §1 "Decompose scope, not process."

### Principle 2 — WBS for replicable work (one contract, N instances)

When the same contract shape repeats from data, write the contract **once** as a WBS template. The runtime spawns instances.

**Use WBS when:**
- N similar children driven by a list (`screens.json`, `entities[]`, `shots[]`).
- N is data-driven and may grow.
- Each instance has the same input/output shape — only the data binding differs.

**Don't use WBS when:**
- One-off tasks (single config, one spec).
- Heterogeneous shapes (different inputs, outputs, or skills) — those are *different* contracts; hand-write them.
- Small fixed N (≤ 3) where hand-writing is clearer.

**Anchor:** `examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/tasks/03-build-screens/wbs/templates/screen-with-reference/` — one template drives 10 screens.

WBS API: see `SCHEMA.md` § WBS API.

### Principle 3 — Progressive decomposition by domain × layer (delegation discipline)

Plan one layer at a time. Write contracts only for your **direct children**. Never reach into grandchildren — that's each child's job when invoked.

Split each layer two ways:

| Split by | What it produces | Example |
|----------|------------------|---------|
| **Lifecycle layer** | Top-level phases | `01-prepare → 02-design-system → 03-build-screens → 05-behavior → 06-wire → 07-overlays` |
| **Domain** | Children inside a phase | inside `03-build-screens/`: one child per screen (`001-home`, `002-cycle-tracking`, …) |
| **Sub-layer** | Grandchildren inside a domain | inside `001-home/`: `001-design`, `002-build`, `003-split`, `004-lift` |

Lifecycle gives the *order* of delegation; domain gives the *fan-out* (who gets which slice).

**Anchor:** `examples/baby-app/.converge/playbooks/default/tasks/` — top-level by lifecycle, second by screen domain, third by sub-layer.

**Hard rule:** when invoked at a node, plan only its direct children. Never read siblings, cousins, or grandchildren. If something's missing from your scope, write it under "Open questions" in PLAN.md — *don't fix under-specification by reaching outside your scope.*

---

## 3. Delegation Patterns

Most projects fit one of five recurring delegation shapes. Pick the closest match before you start writing contracts — it tells you how the root delegates and where WBS belongs.

| Pattern | Root delegates by | WBS sits at | Use when | Anchor examples |
|---|---|---|---|---|
| **Lifecycle Pipeline** | Lifecycle phase (prepare → build → behavior → wire) | Domain entity inside a phase (per-screen, per-endpoint) | One artifact-type evolves through ordered stages; entities replicate within a stage | `examples/baby-app`, `examples/flutter-app`, `examples/stitch-to-flutter-baby-watch-v2` |
| **Process Pipeline** | Functional stage (fetch → transform → validate → report) | None usually — leaves are atomic | Linear flow of data/work; each stage is one bounded operation; no fan-out | `examples/data-pipeline`, `examples/autonomous-pentest` |
| **Creative Workflow** | Creative stage (story → cast → world → style → breakdown → storyboard) | Late-stage replication only (per-shot, per-sheet) | Sequential creative refinement; early stages are singletons; late stages fan out over assets | `examples/cinematic-video-production` |
| **Domain Layering** | Domain entity (characters, scenes, props) | Per-entity at every domain | The deliverable is *N parallel pipelines*, one per entity, with shared upstream specs | `examples/game-assets-video` |
| **Epoch Loop** | Epoch / iteration (a fixed template repeated) | Epoch itself is a WBS template — runtime spawns epoch-001, epoch-002, … | Iterative refinement; quality converges over rounds; stop on a convergence check | `examples/scientific-research`, `examples/frontier-research`, `examples/evolutionary-optimization`, `examples/social-sim` |

### How to pick

Two questions decide the pattern:

1. **Is there a list of N similar entities the project must deliver?** (screens, characters, shots, scenes)
   - If yes and they're delivered *in parallel*, you're in **Domain Layering**.
   - If yes and they're delivered *inside* an ordered stage, you're in **Lifecycle Pipeline** with WBS at that stage.
   - If no, skip to question 2.
2. **Does work refine over rounds, or flow once through stages?**
   - Refines over rounds with a convergence criterion → **Epoch Loop**.
   - Flows once, deterministic stages, no fan-out → **Process Pipeline**.
   - Flows once, creative/qualitative stages with late-stage asset fan-out → **Creative Workflow**.

### Pattern shapes

**Lifecycle Pipeline** — *one artifact, ordered stages, entities replicate within a stage*

```
01-prepare          (singleton: requirements, screens.json)
02-design-system    (singleton)
03-build-screens    ← WBS: per-screen, each spawns its own design→build→split→lift
05-add-behavior     ← partial WBS: per-provider
06-wire-screens     ← partial WBS: per-handler
07-polish
```
Domain entities (screens, providers) are *internal* to phases. Each phase gates the next.

**Process Pipeline** — *deterministic stages, atomic leaves, no replication*

```
01-recon  →  02-intel  →  03-sweep  →  04-explore  →  05-evidence  →  06-report
```
Each stage owns one transformation. No WBS unless one stage genuinely fans out (e.g. `03-sweep` per-target).

> **Process Pipeline is not a license to verb-decompose anything.** It applies when each stage produces a *qualitatively different artifact* (recon-data → intel-summary → sweep-results → … → report) — every stage is a different kind of thing. If your "stages" all operate on the same population (N tokens, N features, N records) and just transform it incrementally, that's process-decomposition of a single scope (§1) — collapse into one task with a per-entity WBS inside.

**Creative Workflow** — *sequential creative refinement, late-stage fan-out*

```
01-story    (logline → synopsis → treatment → screenplay → bible)   singletons
02-cast     (extract → voice-casting → sheets)                       sheets WBS
03-world    (extract → plates)                                       plates WBS
04-style    (visual → palette → audio)                               singletons
05-breakdown (scenes → shots → continuity)                           singletons
06-storyboard                                                        WBS per-shot
07-keyframes                                                         WBS per-shot
```
Early stages produce one artifact; late stages multiply over the assets defined upstream.

**Domain Layering** — *N parallel pipelines, one per entity, shared upstream specs*

```
00-classify-game        (singleton: game type, tokens)
01-art-bible            (singleton: shared visual spec)
02-asset-breakdown      (produces: characters.json, props.json, scenes.json)
03-characters           ← WBS per-character: each runs its own pipeline
03-shared-props         ← WBS per-prop
05-scenes               ← WBS per-scene (consumes characters + props)
06-export
```
Domain entities are *first-class top-level concerns*, each with its own multi-step pipeline. Use when entities are heavy enough to warrant their own delegation tree.

**Epoch Loop** — *iterative refinement until convergence*

```
playbook root
  └── wbs/templates/epoch/
        ├── 001-hypothesize     (or sub-tasks specific to the epoch)
        ├── 002-experiment
        ├── 003-evaluate
        └── 004-decide          (triggers next epoch or convergence)
```
The runtime spawns `epoch-001`, `epoch-002`, … instantiating the same template each time. Stop condition is a convergence check (quality threshold, contradiction-free, score plateau). Goals at the playbook level decide *when to stop spawning*.

### Mixing patterns

Patterns compose. Common combinations:

- **Lifecycle Pipeline + Domain Layering**: top-level lifecycle, but one phase explodes into a Domain-Layering sub-tree (e.g. `03-build-screens/` contains a per-screen pipeline that itself uses lifecycle stages internally — exactly what `baby-app` does).
- **Process Pipeline → Epoch Loop**: a deterministic ingestion phase feeds a research epoch loop.
- **Creative Workflow → Domain Layering**: early creative stages produce specs that downstream Domain Layering consumes (e.g. screenplay → per-shot pipelines).

When mixing, **the outermost pattern dictates how the root delegates**. Don't try to be all five at the top.

### Anti-patterns

- **Lifecycle Pipeline for bulk replicable work.** If you have 100 scenes to generate, sequential phases at the top crush parallelism. Use Domain Layering or push WBS to the right layer.
- **Domain Layering when entities are tiny.** A "per-config-file" fan-out with one-line bodies is just nesting for nesting's sake. Hand-write or move WBS up a level.
- **Epoch Loop without a convergence check.** Without a stop condition, you spawn epochs forever. Define what "converged" looks like *before* writing the template.
- **Process Pipeline when work refines.** Linear stages can't go back. If quality must improve over rounds, use Epoch Loop.
- **Creative Workflow as a hand-graph for deterministic work.** If checks are deterministic and stages are orderable, prefer Process Pipeline — it's mechanically simpler.

---

## 4. The Recipe

To go from "I have a project" to "here's a playbook":

1. **Frame the top-level scope.** What is the project's single concern? One sentence.
2. **Pick a delegation pattern.** Use the picker in §3. Adapt — don't copy.
3. **Identify the layers the pattern prescribes.** Lifecycle phases for Lifecycle/Process/Creative; domain entities for Domain Layering; epoch template for Epoch Loop.
4. **For each layer, identify the next-level fan-out.** Inside a lifecycle phase, what entities replicate? Inside a domain entity, what sub-layers does it pass through?
5. **Mark replication points.** Wherever the same shape repeats from data, that's a WBS template — one contract, N instances. Above the replication layer, hand-write structure; below it, the runtime spawns.
6. **Write contracts top-down, one layer at a time.** At each node, write only your direct children's `TASK.md`. Recurse via the per-layer planner (§6).
7. **Validate every contract.** See §7.

You don't need to invent layers from scratch. Skim the anchor examples in §3 for the closest fit and adapt.

---

## 5. Phases

```
Phase 1 ANALYZE  → .converge/analysis.md       (codebase scan)
Phase 2 DISCOVER → .converge/requirements.md   (user needs)
Phase 3 ARCHITECT → playbook.yml + tasks/      (write contracts)
Phase 4 VALIDATE  → approved plan              (contract review)
```

### Phase 1 — Analyze

Scan what exists. Skip if fresh project.

```bash
ls package.json pyproject.toml go.mod Cargo.toml 2>/dev/null     # runtime
cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' | head -20    # framework
find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | sort    # structure
git log --oneline -10 2>/dev/null && git status --short 2>/dev/null    # state
ls -la .converge/ 2>/dev/null    # existing converge
```

Capture findings into `.converge/analysis.md`: tech stack, file structure, current state, conventions, external dependencies.

### Phase 2 — Discover

Ask the user what they want. Skip if the prompt is already specific.

1. **Vision** — what is this project, what problem does it solve?
2. **Core features** — top 3–5, ranked.
3. **User flows** — the main journey.
4. **Data & APIs** — entities, external services.
5. **Constraints** — deadlines, tech, compliance.

Capture as facts in `.converge/requirements.md`. Facts should be specific (`React 19`, not `React`), measurable (`100 concurrent users`, not `should scale`), and sourced.

### Phase 3 — Architect

You are the project's **top-level manager**. Your job:

1. Apply the recipe (§4) to write the top-level contracts (3–7 phase `TASK.md` files).
2. For each phase, invoke the per-layer planner (§6) — it becomes that phase's "team lead" and writes the phase's children's contracts. Recurse until every leaf is self-contained.
3. Write `playbook.yml` referencing the top-level tasks.
4. Add playbook-level checks (e.g., `npx tsc --noEmit`, `npm test`).

You write **only** the top-level contracts. Sub-layer contracts are written by the per-layer planner, one layer at a time.

### Phase 4 — Validate

Contract review. See §7.

---

## 6. The Per-Layer Planner

**You are a manager being handed one scope of work. Decide whether to do it yourself (leaf) or delegate to 3–7 children. If you delegate, write each child's `TASK.md` (their contract). You do not write your grandchildren's contracts — that's each child's job when invoked.**

Invoked by the CLI as `converge plan <path> [-p "<prompt>"] [--update]`. Once per node.

### Hard rules
- **Don't plan grandchildren.** Stop at one layer.
- **Don't read siblings or descendants.** Your scope packet is exhaustive.
- **Don't invent.** If something's missing, write it under "Open questions" in PLAN.md — the parent will see and repack.
- **Prefer 3–7 children.** If one shape repeats, use a single WBS child, not N hand-written ones.

### The two artifacts

- **`PLAN.md`** — your private reasoning. Why these children, what scope each gets, what's still open. Auditable and re-runnable.
- **`<child>/TASK.md`** — the contract you hand each child. Self-contained.

They have different audiences and don't overwrite each other.

### Scope packet (read in order, skip if missing)

1. **Project brief** — `idea.md` at the project root + the playbook's `playbook.yml`. If neither exists and `prompt` was passed, the prompt substitutes.
2. **Root analysis** — `<playbookRoot>/PLAN.md`.
3. **Ancestor chain** — for each directory along `<playbookRoot> → ... → <nodePath>` (excluding the node itself), read its `PLAN.md` and `TASK.md`.
4. **My own contract** — `<nodePath>/TASK.md` if my parent already wrote one.
5. **User prompt** — appended as additional intent for this invocation.

That's `O(depth)` — root + ancestors + me. Never siblings, cousins, or descendants.

### What `PLAN.md` contains

- **Goal restatement** — my scope in my own words (sanity-check what the parent asked for).
- **Decision** — am I a `LEAF EXECUTABLE TASK` or a `CONTAINER`?
- **If CONTAINER:** 3–7 direct children. Each with `id`, `title`, `kind` (`executable` | `wbs`), `goal`, `scope` (what I'll pack into their TASK.md), `outputs`, `checks`, and for WBS children the data driving the fan-out.
- **If LEAF:** a one-paragraph plan plus the deterministic checks that gate it.
- **Open questions** — anything missing from the scope packet that the parent should have packed.

### Materialize children

For each child the plan defined, create `<nodePath>/<child-id>/TASK.md`. Two shapes:

| Shape | TASK.md frontmatter | Recursion |
|---|---|---|
| **Executable** | `outputs:` + `checks:` + body. No `wbs:`. | None. Ready to run. |
| **WBS** | `wbs:` pointer (script or template). | None *now*. Runtime plans each spawned child when it expands. |

For **static container** children (those that themselves decompose into 3–7 hand-written sub-children), recursively invoke the planner:

```bash
converge plan <nodePath>/<child-id>${UPDATE_FLAG:-}
```

Don't recurse into leaf executables (no further decomposition) or WBS children (deferred to runtime).

### Modes

- **`fresh`** — nothing at this node yet. Plan from scratch.
- **`fill-in`** (default re-run) — `PLAN.md` exists, some `TASK.md` files exist. Overwrite `PLAN.md`, fill missing `TASK.md` files, **don't overwrite existing ones**, skip recursion into children that already have a `PLAN.md`.
- **`update`** — treat existing `PLAN.md` and child set as drafts to revise. Be explicit about what changed:
  - *New* children → materialize, recurse normally.
  - *Removed* children → rename to `_deprecated/<id>/`, never silently drop.
  - *Modified* children whose TASK.md still matches the previous PLAN.md → re-materialize, recurse with `--update`.
  - *Modified* children whose TASK.md has diverged (human edited) → leave the file untouched, write a conflict note in PLAN.md.

> **`converge plan` proposes; the user disposes.**

---

## 7. Validate (Contract Review)

For every `TASK.md`, check:

- **Bounded scope.** Title is one sentence. Body is concrete instructions, not vague.
- **Sharp inputs.** Every `input` traces to an upstream `output`. No orphans. No `src/**/*` globs.
- **Specific outputs.** Specific paths, not "various files."
- **Result-named, not process-named.** The task's `outputs:` describe a result that exists when done — not a stage of work. If sibling tasks read like verbs of one workflow over the same population, you've decomposed process; re-decompose by scope (§1 "Decompose scope, not process").
- **Deterministic checks.** Every output has at least one check. Checks return 0 / non-zero. No string matching.
- **Self-contained.** An executor reading only this `TASK.md` and its declared inputs can complete the work.
- **Body is instructions only.** No work product pasted into the body — specs, designs, data live in declared input files. If the body contains content another task would need, that's a missing artifact (§1).
- **Acyclic deps.** No cycles. Deps are minimal — only what's actually consumed.

A failed validation is a **leaky contract**, not a structural error. Tighten it.

For container tasks, also check that the children form a complete cover of the parent's scope — every commitment in the parent's `outputs` is delivered by some child.

When validation passes, the plan is ready for `converge run`.

---

## 8. Anti-Patterns

- **Flat 30-task playbook** → top is doing everyone's job. Group by concern.
- **One-child node** → no delegation. Collapse into parent.
- **Mixed-shape siblings** → multiple concerns leaked. Split.
- **Process-stage decomposition** (`fetch → clean → analyze`, `spec → author → prompt → render`) → you split the workflow instead of the scope. Each "stage" task processes the whole population; failures re-run the whole stage. Re-decompose by *what exists when done*: one task per entity (or one WBS), each owning its end-to-end mini-workflow. The verbs belong inside one task body, not as sibling task names. See §1 "Decompose scope, not process."
- **5 hand-written near-copies** → use a WBS template.
- **Orphan input** → upstream contract didn't deliver. Fix the chain.
- **Over-broad input (`src/**/*`)** → leaky scope. Narrow it.
- **Pasting content into a TASK.md body that another task needs** → missing artifact. Make the producer write a file; declare it as `output:` / `input:`.
- **Structured data inlined as prose** → use JSON in a file, not paragraphs in a body.
- **Hard-coding project data into a TASK.md body or `vars:`** → playbook becomes single-use. Move the data to a project file the WBS reads.
- **Reaching into grandchildren during planning** → broken delegation discipline. Stop at your layer.
- **Skipping analysis on existing codebase** → planning blind.
- **No checks on a task** → no acceptance criterion. Add one.
- **Inventing facts to fill scope-packet gaps** → write Open Questions instead.

---

## 9. Quick Reference

```
SKILL.md   — the whole skill (model, principles, delegation patterns, recipe, phases, planner, validate, anti-patterns)
SCHEMA.md  — TASK.md / playbook.yml / WBS API format tables
```

### Anchor playbooks

| Example | What it shows |
|---|---|
| `examples/baby-app/` | Deep nesting (3 levels): lifecycle → screen domain → sub-layer |
| `examples/stitch-to-flutter-baby-watch-v2/` | WBS templates for per-screen replication, plus a second playbook (`realdevice`) layering platform concerns |
| `examples/deep-research/` | WBS at every layer; templates for `initial → research → report` epochs |
| `examples/cinematic-video-production/` | Domain-first split (`story → cast → world → style → breakdown → storyboard → keyframes`) with WBS at the per-shot/per-sheet layer |

### Directory layout

```
.converge/
├── project.yml
└── playbooks/
    └── default/
        ├── playbook.yml
        └── tasks/
            ├── 01-phase-name/
            │   ├── TASK.md            # Container contract
            │   ├── 001-task/TASK.md   # Direct child contracts
            │   └── 002-task/
            │       ├── TASK.md
            │       └── 001-sub/TASK.md   # Nests as deep as needed
            └── 02-phase-name/
                ├── TASK.md
                ├── wbs/index.js       # WBS template (one contract, N instances)
                └── tasks/             # WBS-spawned children at runtime
                    └── ...
```
