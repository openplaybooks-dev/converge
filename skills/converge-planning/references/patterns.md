# Goal-Tree Shapes Reference

Every playbook is a **composition of nested task containers**. Every container has static or dynamic children. The shapes below describe how containers are arranged — not whether they use spawning.

**Composition is always the frame:**
- A container has `tasks/<child>/TASK.md` files (static children)
- OR a container has a `spawn:` block and its children come from `templates/` (dynamic children)
- OR both (static parent, dynamic children inside)

The shape names describe the arrangement of containers, not the static/dynamic choice. That choice is local to each container.

**Don't pick a shape first; let the goal tree dictate the container hierarchy.**

---

## Pattern Overview

| Shape | Container arrangement | Static/dynamic at each level | Anchor examples |
|---|---|---|---|
| **Ordered Stages** | Phase containers in sequence | Phase children static; entity children inside a phase may be dynamic | `examples/baby-app`, `examples/flutter-app` |
| **Linear Pipeline** | Stage containers in sequence | All static children (no fan-out at any level) | `examples/data-pipeline` |
| **Creative Progression** | Stage containers in sequence | Early stages static; late stages dynamic (per-shot, per-sheet) | `examples/cinematic-video-production` |
| **Domain Split** | Domain containers in parallel | Shared specs static; per-entity containers may be static or dynamic | `examples/game-assets-video` |
| **Epoch Loop** | Root epoch container | Static root with `converge:` config; epoch children from template | `examples/scientific-research`, `examples/frontier-research` |
| **Goal-Driven Epoch Loop** | Root goal container | Root with `converge:` config; epoch children from template; each epoch has static children | dynamic goal-driven loops |

---

## How Shapes Emerge

Decompose the goal into nested containers. At each container, decide static or dynamic:

- Children known at plan time, N ≤ 15 → **static** (`tasks/` children)
- Children data-driven or N > 15 → **dynamic** (spawn from template)

After decomposing, look at the resulting tree shape:

- Containers form a linear chain → **Ordered Stages** or **Linear Pipeline**
- One container fans out to N identical children → **Domain Split**
- Root loops across epochs, each epoch has static children → **Epoch Loop** or **Goal-Driven Epoch Loop**

The shape confirms the decomposition is coherent. If the shape feels forced, the decomposition might be wrong.

---

## Pattern Shapes

### Ordered Stages — *phase containers in sequence; entities fan out inside a phase*

```
01-prepare/
└── tasks/
    ├── 01-db-schema/          # static child
    └── 02-seed-data/           # static child
02-design-system/
└── tasks/
    └── 01-design-refs/         # static child
03-build-screens/               # container with DYNAMIC children (spawn template)
└── tasks/                      # ← none; children come from templates/
```

Top-level phase containers are **static**. Per-entity children inside a phase (screens, providers) are **dynamic** when the entity list is a runtime catalog.

> **Static/dynamic at each level:** Phase containers → static children. Entity fan-out inside a phase → dynamic (templates).

### Linear Pipeline — *all containers have static children, no fan-out*

```
01-recon/
└── tasks/
    ├── 01-fetch-data/           # static
    └── 02-clean-data/           # static
02-analyze/
└── tasks/
    └── 01-run-analysis/         # static
03-report/
└── tasks/
    └── 01-generate-report/      # static
```

No container fans out. Every child is known at plan time and written as a static `TASK.md`.

> **Static/dynamic at each level:** All containers → static children. No spawning anywhere.

### Creative Progression — *static early stages, dynamic late stages*

```
01-story/
└── tasks/
    └── 01-write-story/          # static
02-cast/
└── tasks/
    └── 01-produce-casting/      # static (produces cast-sheet)
03-storyboards/                   # container with DYNAMIC children
└── tasks/                       # ← none; children come from breakdown.json
```

Early creative stages produce upstream specs (static). Downstream stages that multiply over assets (per-shot, per-sheet) are **dynamic** — the asset list isn't known until the upstream stage runs.

> **Static/dynamic at each level:** Early stages → static. Late fan-out → dynamic.

### Domain Split — *parallel domain containers; each has its own sub-tree*

```
00-classify-game/                 # static: produces domain manifest
└── tasks/
    └── 01-classify/             # static
01-characters/                   # container: static children OR dynamic from catalog
└── tasks/
    ├── 01-character-design/     # static child
    └── 02-character-impl/       # static child
02-scenes/                       # container: children from scene catalog
└── tasks/                       # ← none if scene list is runtime data
```

Each domain is its own container with a sub-tree. Shared upstream specs are static. Per-domain children may be static or dynamic depending on whether the domain entity list is known at plan time.

> **Static/dynamic at each level:** Shared spec containers → static. Per-domain containers → can be either.

### Epoch Loop — *root container with converge: config; epoch children from template*

```
playbook root/
tasks/
  01-evolution/                 # static container with converge: config
  └── tasks/
      01-hypothesize/            # static child inside epoch
      02-experiment/            # static child inside epoch
      03-evaluate/              # static child inside epoch
templates/
  epoch/                        # spawn template for each epoch instance
```

The root is a static `tasks/` container with `converge:` config. Each epoch is a spawn template with static children.

> **Static/dynamic at each level:** Root container → static with `converge:` config. Epoch children → dynamic (spawn template).

### Goal-Driven Epoch Loop — *declared goals in playbook.yml; root converger spawns one epoch per goal*

```
playbook.yml
  goals:
    - id: code-quality
      checks:
        - id: tsc
          cmd: pnpm tsc --noEmit

playbook root/
tasks/
  01-driver/                    # static container with converge: config
  └── tasks/
      01-implement/            # static child
      02-verify/              # static child
templates/
  epoch/                       # spawn template
  phase/                       # spawn template
```

Goals are declared in `playbook.yml`. The root converger evaluates goal state each epoch and spawns the next epoch. Each epoch is a spawn template with static children.

> **Static/dynamic at each level:** Root → static with `converge:` config. Epochs → dynamic (spawn template). Epoch internals → static.

---

## How Shapes Compose

Shapes compose vertically (nested levels) and horizontally (sibling containers):

- **Ordered Stages + Domain Split**: Phase 03-build-screens/ contains per-screen children that are themselves containers with static → dynamic internals (flutter-app structure).
- **Epoch Loop + Domain Split**: Each epoch template spawns a Domain Split sub-tree.
- **Creative Progression + Epoch Loop**: Early creative stages are static; later stages that refine over epochs use the Epoch Loop pattern.

The outermost shape describes how the root goal decomposes. Sub-trees inside containers may use different shapes.

---

## Per-Shape Anti-Patterns

- **Ordered Stages for bulk replicable work.** If 100 scenes should be generated, sequential phases at the top crush parallelism. Use Domain Split with the fan-out at the scene layer.
- **Domain Split when deliverables are tiny.** A per-config-file container with one-line bodies is just nesting for nesting's sake. Write the children as static tasks instead.
- **Epoch Loop without a convergence check.** Without a stop condition, you spawn epochs forever. Define what "converged" looks like before writing the template.
- **Linear Pipeline when work refines.** Linear stages can't go back. If quality must improve over rounds, use Epoch Loop.

```
01-prepare          (singleton: requirements, screens.json)
02-design-system    (singleton)
03-build-screens    ← spawner per-screen, each spawns its own design→build→split→lift
05-add-behavior     ← partial spawner: per-provider
06-wire-screens     ← partial spawner: per-handler
07-polish
```
Domain entities (screens, providers) are *internal* to phases. Each phase gates the next.

> **Static/dynamic:** Top-level phase containers are static (hand-written). Per-entity replication inside a phase (per-screen, per-provider) is dynamic via catalog + templates + runtime spawn — children are *expected* after the catalog task runs. **Tests:** Phase-boundary checks gate progression (e.g., "all screens generated"); per-entity checks validate each spawned child.

### Linear Pipeline — *deterministic stages, atomic leaves, no replication*

```
01-recon  →  02-intel  →  03-sweep  →  04-explore  →  05-evidence  →  06-report
```
Each stage owns one transformation. No spawner unless one stage genuinely fans out (e.g. `03-sweep` per-target).

> **Static/dynamic:** All stages are static by default — each produces a qualitatively different artifact. If a stage fans out (per-target sweep), that stage is dynamic through templates + runtime spawn. **Tests:** Each stage's output is gated by a check before the next stage runs. The final report has a playbook-level check.

> **Linear Pipeline is not a license to verb-decompose anything.** It applies when each stage produces a *qualitatively different artifact* (recon-data → intel-summary → sweep-results → … → report) — every stage is a different kind of thing. If your "stages" all operate on the same population (N tokens, N features, N records) and just transform it incrementally, that's process-decomposition of a single scope — collapse into one task with a per-entity spawner inside.

### Creative Progression — *sequential creative refinement, late-stage fan-out*

```
01-story    (logline → synopsis → treatment → screenplay → bible)   singletons
02-cast     (extract → voice-casting → sheets)                       sheets spawner
03-world    (extract → plates)                                       plates spawner
04-style    (visual → palette → audio)                               singletons
05-breakdown (scenes → shots → continuity)                           singletons
06-storyboard                                                        spawner per-shot
07-keyframes                                                         spawner per-shot
```
Early stages produce one artifact; late stages multiply over the assets defined upstream.

> **Static/dynamic:** Early creative stages (story, style, breakdown) are static singletons. Late-stage fan-out (per-shot, per-sheet) is dynamic via templates + runtime spawn — children are *expected* from breakdown outputs. **Tests:** Singleton stages have format/content checks; spawned children each have per-asset checks. Cross-stage consistency checks at playbook level (e.g., "every shot in the breakdown has a storyboard frame").

### Domain Split — *N parallel pipelines, one per entity, shared upstream specs*

```
00-classify-game        (singleton: game type, tokens)
01-art-bible            (singleton: shared visual spec)
02-asset-breakdown      (produces: characters.json, props.json, scenes.json)
03-characters           ← spawner per-character: each runs its own pipeline
03-shared-props         ← spawner per-prop
05-scenes               ← spawner per-scene (consumes characters + props)
06-export
```
Domain entities are *first-class top-level concerns*, each with its own multi-step pipeline. Use when entities are heavy enough to warrant their own delegation tree.

> **Static/dynamic:** Shared upstream specs (classify-game, art-bible, asset-breakdown) are static singletons. Per-entity domain containers (characters, props, scenes) are static containers whose internal pipelines are dynamic via catalog + templates + runtime spawn. **Tests:** Shared spec tasks have format checks. Each domain has cross-entity consistency checks. Playbook-level checks validate cross-domain invariants (e.g., "every character appearing in a scene exists in characters.json").

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

> **Static/dynamic:** The epoch template is static (hand-written `TASK.md` files). Each epoch instance is a dynamic subtask spawned at runtime. The number of epochs is unknown at plan time — the convergence check decides when to stop. **Tests:** Each epoch has internal checks validating its own outputs. The convergence check is the most important test in the playbook — it defines "done."

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
  DIVERGE                          CONVERGE
  spawner writes <id>/spawn.yml →  children execute    →  parent evaluates
  (implement, verify)              independently           goal state, decides
                                                            continue or halt
```

Each epoch follows the **diverge → converge** rhythm:
1. **Diverge**: the root with `converge:` config evaluates goals, picks the first unsatisfied goal, writes one `<id>/spawn.yml` per implement+verify child under `$CONVERGE_SPAWN_DIR`; the framework expands and applies
2. **Children execute**: implement makes the change, verify runs the goal's checks
3. **Converge**: the wave-loop re-evaluates goal state — if goals remain, the next wave fires (spawn next epoch); if all satisfied, the body writes `$CONVERGE_TASK_DIR/halt.marker` to halt cleanly

A goal is satisfied when **all** its checks pass. Goals replace the old playbook-level `checks:` — there is no separate post-run validation system.

Use when the work is large, replayable, and has clear measurable completion conditions. Unlike a research epoch loop (incremental quality improvement), the goal-driven loop targets specific, binary completion conditions.

> **Static/dynamic:** Goals and their checks are declared in playbook.yml. Epochs are spawned dynamically from a template. **Tests:** Every goal check IS a test — deterministic shell command, exit 0 = pass. Playbook bounds (maxIterations, stall) prevent infinite loops.

---

## Mixing Shapes

Goal-tree shapes compose. Common combinations:

- **Ordered Stages + Domain Split**: top-level ordered stages, but one stage fans out into a Domain-Split sub-tree (e.g., `03-build-screens/` contains per-screen deliverables that themselves use ordered stages internally — exactly what `baby-app` does).
- **Linear Pipeline → Epoch Loop**: a deterministic ingestion phase feeds a research epoch loop.
- **Creative Progression → Domain Split**: early creative stages produce specs that downstream Domain Split consumes (e.g., screenplay → per-shot pipelines).

When mixing, **the outermost shape describes how the root goal decomposes**. Don't force-fit all sub-trees into the same shape.

---

## Per-Shape Anti-Patterns

- **Ordered Stages for bulk replicable work.** If you have 100 scenes to generate, sequential phases at the top crush parallelism. Use Domain Split or push runtime fan-out to the right layer.
- **Domain Split when deliverables are tiny.** A "per-config-file" fan-out with one-line bodies is just nesting for nesting's sake. Hand-write or move runtime fan-out up a level.
- **Epoch Loop without a convergence check.** Without a stop condition, you spawn epochs forever. Define what "converged" looks like *before* writing the template.
- **Linear Pipeline when work refines.** Linear stages can't go back. If quality must improve over rounds, use Epoch Loop.
- **Creative Progression for deterministic work.** If checks are deterministic and stages are orderable, prefer Linear Pipeline — it's mechanically simpler.
