# Goal-Tree Shapes Reference

Common shapes that emerge from goal decomposition. Use this reference to sanity-check your decomposition — if your goal tree looks nothing like any of these, it might be process decomposition. **Don't pick a shape first; let the goal tree dictate the shape.**

---

## Pattern Overview

After decomposing a user's goal into deliverable sub-goals, the resulting task tree will often match one of five recurring shapes:

| Shape | Root delegates by | Seed sits at | Emerges when | Anchor examples |
|---|---|---|---|---|
| **Ordered Stages** | Delivery phase (dataset → analysis → report) | Domain entity inside a phase | One artifact-type evolves through ordered stages; entities replicate within a stage | `examples/baby-app`, `examples/flutter-app` |
| **Linear Pipeline** | Functional transform (fetch → transform → validate → report) | None usually — leaves are atomic | Linear flow of data/work; each stage is one bounded operation; no fan-out | `examples/data-pipeline` |
| **Creative Progression** | Creative stage (story → cast → world → style → breakdown → storyboard) | Late-stage replication only (per-shot, per-sheet) | Sequential creative refinement; early stages are singletons; late stages fan out over assets | `examples/cinematic-video-production` |
| **Domain Split** | Domain entity (characters, scenes, props) | Per-entity at every domain | The deliverable is *N parallel pipelines*, one per entity, with shared upstream specs | `examples/game-assets-video` |
| **Epoch Loop** | Epoch / iteration (a fixed template repeated) | Epoch itself is a seed template | Iterative refinement; quality converges over rounds; stop on a convergence check | `examples/scientific-research`, `examples/frontier-research` |
| **Goal-Driven Epoch Loop** | Declared goal set in playbook.yml | Epoch from template, adaptive per remaining goal | Work is large and replayable with clear measurable completion conditions; each epoch targets an unsatisfied goal | `examples/goal-driven-dev/` |

---

## How Shapes Emerge

After decomposing the user's goal into deliverable sub-goals, look at the dependency graph:

- Sub-goals form a chain where each depends on the prior one's output → **Linear Pipeline** or **Ordered Stages** shape
- Sub-goals are N identical deliverables from a catalog → **Domain Split** with seed fan-out shape
- Sub-goal is "improve quality" with no natural endpoint → **Epoch Loop** shape
- Sub-goals start as singletons then fan out over assets defined late → **Creative Progression** shape
- User describes a measurable end state with clear checks ("all tests pass", "zero type errors") → **Goal-Driven Epoch Loop** shape

The shape confirms a good decomposition. If you force a shape onto the goal (e.g., "this must be a lifecycle pipeline"), you'll miss the user's actual needs.

Two questions help recognize the shape:

1. **Is there a list of N similar deliverables?** (screens, characters, endpoints)
   - Delivered in parallel → **Domain Split** shape
   - Delivered inside an ordered stage → **Ordered Stages** with seed shape
   - If no, skip to question 2.
2. **Does work refine over rounds, or flow once through stages?**
   - Refines over rounds with a convergence criterion → **Epoch Loop** shape
   - Flows once, deterministic stages, no fan-out → **Linear Pipeline** shape
   - Flows once, creative stages with late-stage asset fan-out → **Creative Progression** shape

---

## Pattern Shapes

### Ordered Stages — *one artifact, ordered stages, entities replicate within a stage*

```
01-prepare          (singleton: requirements, screens.json)
02-design-system    (singleton)
03-build-screens    ← seed: per-screen, each spawns its own design→build→split→lift
05-add-behavior     ← partial seed: per-provider
06-wire-screens     ← partial seed: per-handler
07-polish
```
Domain entities (screens, providers) are *internal* to phases. Each phase gates the next.

> **Static/dynamic:** Top-level phase containers are static (hand-written). Per-entity replication inside a phase (per-screen, per-provider) is dynamic via catalog + seed — children are *expected* after the catalog task runs. **Tests:** Phase-boundary checks gate progression (e.g., "all screens generated"); per-entity checks validate each spawned child.

### Linear Pipeline — *deterministic stages, atomic leaves, no replication*

```
01-recon  →  02-intel  →  03-sweep  →  04-explore  →  05-evidence  →  06-report
```
Each stage owns one transformation. No seed unless one stage genuinely fans out (e.g. `03-sweep` per-target).

> **Static/dynamic:** All stages are static by default — each produces a qualitatively different artifact. If a stage fans out (per-target sweep), that stage is dynamic (seed). **Tests:** Each stage's output is gated by a check before the next stage runs. The final report has a playbook-level check.

> **Linear Pipeline is not a license to verb-decompose anything.** It applies when each stage produces a *qualitatively different artifact* (recon-data → intel-summary → sweep-results → … → report) — every stage is a different kind of thing. If your "stages" all operate on the same population (N tokens, N features, N records) and just transform it incrementally, that's process-decomposition of a single scope — collapse into one task with a per-entity seed inside.

### Creative Progression — *sequential creative refinement, late-stage fan-out*

```
01-story    (logline → synopsis → treatment → screenplay → bible)   singletons
02-cast     (extract → voice-casting → sheets)                       sheets seed
03-world    (extract → plates)                                       plates seed
04-style    (visual → palette → audio)                               singletons
05-breakdown (scenes → shots → continuity)                           singletons
06-storyboard                                                        seed per-shot
07-keyframes                                                         seed per-shot
```
Early stages produce one artifact; late stages multiply over the assets defined upstream.

> **Static/dynamic:** Early creative stages (story, style, breakdown) are static singletons. Late-stage fan-out (per-shot, per-sheet) is dynamic via seed — children are *expected* from breakdown outputs. **Tests:** Singleton stages have format/content checks; seed-spawned children each have per-asset checks. Cross-stage consistency checks at playbook level (e.g., "every shot in the breakdown has a storyboard frame").

### Domain Split — *N parallel pipelines, one per entity, shared upstream specs*

```
00-classify-game        (singleton: game type, tokens)
01-art-bible            (singleton: shared visual spec)
02-asset-breakdown      (produces: characters.json, props.json, scenes.json)
03-characters           ← seed per-character: each runs its own pipeline
03-shared-props         ← seed per-prop
05-scenes               ← seed per-scene (consumes characters + props)
06-export
```
Domain entities are *first-class top-level concerns*, each with its own multi-step pipeline. Use when entities are heavy enough to warrant their own delegation tree.

> **Static/dynamic:** Shared upstream specs (classify-game, art-bible, asset-breakdown) are static singletons. Per-entity domain containers (characters, props, scenes) are static containers whose internal pipelines are dynamic via catalog + templates + runtime spawn. **Checks:** Shared spec tasks have format checks. Each domain has cross-entity consistency checks. Playbook-level checks validate cross-domain invariants (e.g., "every character appearing in a scene exists in characters.json").

### Epoch Loop — *iterative refinement until convergence*

```
playbook root
  └── templates/epoch/
        ├── 001-hypothesize     (or sub-tasks specific to the epoch)
        ├── 002-experiment
        ├── 003-evaluate
        └── 004-decide          (triggers next epoch or convergence)
```
The runtime spawns `epoch-001`, `epoch-002`, … instantiating the same template each time. Stop condition is a convergence check (quality threshold, contradiction-free, score plateau). Goals at the playbook level decide *when to stop spawning*.

> **Static/dynamic:** The epoch template is static (hand-written `TASK.md` files). Each epoch instance is a dynamic subtask spawned at runtime. The number of epochs is unknown at plan time — the convergence check decides when to stop. **Checks:** Each epoch has internal checks validating its own outputs. The convergence check is the most important check in the playbook — it defines "done."

### Goal-Driven Epoch Loop — *declared goal set, diverge→converge each epoch, stops when all goals pass*

```
playbook.yml
  goals:
    - id: code-quality       # ← each goal has multiple checks
      description: "All quality gates pass"
      checks:
        - id: type-check
          cmd: "pnpm tsc --noEmit"
        - id: tests
          cmd: "pnpm vitest run"

DAG per epoch:
  DIVERGE                    CONVERGE
  seed spawns children  →  children execute    →  parent evaluates
  (implement, verify)       independently          goal state, decides
                                                    continue or stop
```

Each epoch follows the **diverge → converge** rhythm:
1. **Diverge**: the root seed evaluates goals via `ctx.goals.evaluate()`, picks the first unsatisfied goal, spawns an epoch with implement+verify tasks targeting that goal
2. **Children execute**: implement makes the change, verify runs the goal's checks
3. **Converge**: the seed re-evaluates goal state — if goals remain, diverge again (spawn next epoch); if all satisfied, `ctx.loop.stop()`

A goal is satisfied when **all** its checks pass. Goals replace the old playbook-level `checks:` — there is no separate post-run validation system.

Use when the work is large, replayable, and has clear measurable completion conditions. Unlike a research epoch loop (incremental quality improvement), the goal-driven loop targets specific, binary completion conditions.

> **Static/dynamic:** Goals and their checks are declared in playbook.yml. The root seed is a hand-written JS file. Epochs are spawned dynamically from a template. **Tests:** Every goal check IS a test — deterministic shell command, exit 0 = pass. Playbook bounds (maxIterations, stall) prevent infinite loops. **Anchor:** `examples/goal-driven-dev/`.

---

## Mixing Shapes

Goal-tree shapes compose. Common combinations:

- **Ordered Stages + Domain Split**: top-level ordered stages, but one stage fans out into a Domain-Split sub-tree (e.g., `03-build-screens/` contains per-screen deliverables that themselves use ordered stages internally — exactly what `baby-app` does).
- **Linear Pipeline → Epoch Loop**: a deterministic ingestion phase feeds a research epoch loop.
- **Creative Progression → Domain Split**: early creative stages produce specs that downstream Domain Split consumes (e.g., screenplay → per-shot pipelines).

When mixing, **the outermost shape describes how the root goal decomposes**. Don't force-fit all sub-trees into the same shape.

---

## Per-Shape Anti-Patterns

- **Ordered Stages for bulk replicable work.** If you have 100 scenes to generate, sequential phases at the top crush parallelism. Use Domain Split or push seed to the right layer.
- **Domain Split when deliverables are tiny.** A "per-config-file" fan-out with one-line bodies is just nesting for nesting's sake. Hand-write or move seed up a level.
- **Epoch Loop without a convergence check.** Without a stop condition, you spawn epochs forever. Define what "converged" looks like *before* writing the template.
- **Linear Pipeline when work refines.** Linear stages can't go back. If quality must improve over rounds, use Epoch Loop.
- **Creative Progression for deterministic work.** If checks are deterministic and stages are orderable, prefer Linear Pipeline — it's mechanically simpler.
