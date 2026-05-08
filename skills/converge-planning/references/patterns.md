# Delegation Patterns Reference

Full delegation pattern reference for converge-planning. Read after picking a pattern in SKILL.md, or when you need shape details, static/dynamic behavior, test expectations, and mix guidance for a chosen pattern.

---

## Pattern Overview

Most projects fit one of five recurring delegation shapes. Pick the closest match before you start writing contracts — it tells you how the root delegates and where seed belongs.

| Pattern | Root delegates by | seed sits at | Use when | Anchor examples |
|---|---|---|---|---|
| **Lifecycle Pipeline** | Lifecycle phase (prepare → build → behavior → wire) | Domain entity inside a phase (per-screen, per-endpoint) | One artifact-type evolves through ordered stages; entities replicate within a stage | `examples/baby-app`, `examples/flutter-app`, `examples/stitch-to-flutter-baby-watch-v2` |
| **Process Pipeline** | Functional stage (fetch → transform → validate → report) | None usually — leaves are atomic | Linear flow of data/work; each stage is one bounded operation; no fan-out | `examples/data-pipeline`, `examples/autonomous-pentest` |
| **Creative Workflow** | Creative stage (story → cast → world → style → breakdown → storyboard) | Late-stage replication only (per-shot, per-sheet) | Sequential creative refinement; early stages are singletons; late stages fan out over assets | `examples/cinematic-video-production` |
| **Domain Layering** | Domain entity (characters, scenes, props) | Per-entity at every domain | The deliverable is *N parallel pipelines*, one per entity, with shared upstream specs | `examples/game-assets-video` |
| **Epoch Loop** | Epoch / iteration (a fixed template repeated) | Epoch itself is a seed template — runtime spawns epoch-001, epoch-002, … | Iterative refinement; quality converges over rounds; stop on a convergence check | `examples/scientific-research`, `examples/frontier-research`, `examples/evolutionary-optimization`, `examples/social-sim` |

---

## How to Pick

Two questions decide the pattern:

1. **Is there a list of N similar entities the project must deliver?** (screens, characters, shots, scenes)
   - If yes and they're delivered *in parallel*, you're in **Domain Layering**.
   - If yes and they're delivered *inside* an ordered stage, you're in **Lifecycle Pipeline** with seed at that stage.
   - If no, skip to question 2.
2. **Does work refine over rounds, or flow once through stages?**
   - Refines over rounds with a convergence criterion → **Epoch Loop**.
   - Flows once, deterministic stages, no fan-out → **Process Pipeline**.
   - Flows once, creative/qualitative stages with late-stage asset fan-out → **Creative Workflow**.

---

## Pattern Shapes

### Lifecycle Pipeline — *one artifact, ordered stages, entities replicate within a stage*

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

### Process Pipeline — *deterministic stages, atomic leaves, no replication*

```
01-recon  →  02-intel  →  03-sweep  →  04-explore  →  05-evidence  →  06-report
```
Each stage owns one transformation. No seed unless one stage genuinely fans out (e.g. `03-sweep` per-target).

> **Static/dynamic:** All stages are static by default — each produces a qualitatively different artifact. If a stage fans out (per-target sweep), that stage is dynamic (seed). **Tests:** Each stage's output is gated by a check before the next stage runs. The final report has a playbook-level check.

> **Process Pipeline is not a license to verb-decompose anything.** It applies when each stage produces a *qualitatively different artifact* (recon-data → intel-summary → sweep-results → … → report) — every stage is a different kind of thing. If your "stages" all operate on the same population (N tokens, N features, N records) and just transform it incrementally, that's process-decomposition of a single scope — collapse into one task with a per-entity seed inside.

### Creative Workflow — *sequential creative refinement, late-stage fan-out*

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

### Domain Layering — *N parallel pipelines, one per entity, shared upstream specs*

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

> **Static/dynamic:** Shared upstream specs (classify-game, art-bible, asset-breakdown) are static singletons. Per-entity domain containers (characters, props, scenes) are static containers whose internal pipelines are dynamic via catalog + seed. **Tests:** Shared spec tasks have format checks. Each domain has cross-entity consistency checks. Playbook-level checks validate cross-domain invariants (e.g., "every character appearing in a scene exists in characters.json").

### Epoch Loop — *iterative refinement until convergence*

```
playbook root
  └── seeds/templates/epoch/
        ├── 001-hypothesize     (or sub-tasks specific to the epoch)
        ├── 002-experiment
        ├── 003-evaluate
        └── 004-decide          (triggers next epoch or convergence)
```
The runtime spawns `epoch-001`, `epoch-002`, … instantiating the same template each time. Stop condition is a convergence check (quality threshold, contradiction-free, score plateau). Goals at the playbook level decide *when to stop spawning*.

> **Static/dynamic:** The epoch template is static (hand-written `TASK.md` files). Each epoch instance is a dynamic subtask spawned by the seed. The number of epochs is unknown at plan time — the convergence check decides when to stop. **Tests:** Each epoch has internal checks validating its own outputs. The convergence check is the most important test in the playbook — it defines "done."

---

## Mixing Patterns

Patterns compose. Common combinations:

- **Lifecycle Pipeline + Domain Layering**: top-level lifecycle, but one phase explodes into a Domain-Layering sub-tree (e.g. `03-build-screens/` contains a per-screen pipeline that itself uses lifecycle stages internally — exactly what `baby-app` does).
- **Process Pipeline → Epoch Loop**: a deterministic ingestion phase feeds a research epoch loop.
- **Creative Workflow → Domain Layering**: early creative stages produce specs that downstream Domain Layering consumes (e.g. screenplay → per-shot pipelines).

When mixing, **the outermost pattern dictates how the root delegates**. Don't try to be all five at the top.

---

## Per-Pattern Anti-Patterns

- **Lifecycle Pipeline for bulk replicable work.** If you have 100 scenes to generate, sequential phases at the top crush parallelism. Use Domain Layering or push seed to the right layer.
- **Domain Layering when entities are tiny.** A "per-config-file" fan-out with one-line bodies is just nesting for nesting's sake. Hand-write or move seed up a level.
- **Epoch Loop without a convergence check.** Without a stop condition, you spawn epochs forever. Define what "converged" looks like *before* writing the template.
- **Process Pipeline when work refines.** Linear stages can't go back. If quality must improve over rounds, use Epoch Loop.
- **Creative Workflow as a hand-graph for deterministic work.** If checks are deterministic and stages are orderable, prefer Process Pipeline — it's mechanically simpler.
