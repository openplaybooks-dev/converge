---
title: "CLI Redesign: dbt-style task selection"
description: "Design proposal for the next iteration of the converge CLI: command verbs, a selection DSL, and a target/ artifact."
---

# CLI Redesign: dbt-style task selection

> Historical design proposal for a future `converge` CLI redesign.
>
> Status: **not the current shipped contract**. The current runtime still compiles and runs against `.converge/journal/<playbook>/`, and readers should use the CLI reference pages plus `converge --help` for actual behavior.
>
> **Scope: command verbs + a selection DSL + a `target/` artifact.** Adopts dbt's mental model wholesale: a playbook is a project, a task is a node, `depends_on` is the edge, the CLI takes a composable `--select` expression. The runtime, the TASK.md schema, Seed, and the journal are unchanged. What ships is (a) a smaller verb set, (b) `--select` / `--exclude` with `+`/`@`/`*` graph operators and `method:value` selectors, (c) named selectors in `selectors.yml`, (d) a compiled `target/manifest.json`, and (e) a full migration table from today's commands.

## TL;DR

A Converge playbook is a DAG. The current CLI doesn't treat it like one. To run "this task and everything downstream of it" today, you can't: there's a single positional substring filter and that's it. dbt solved this years ago with a tiny, composable selection language. This proposal lifts dbt's syntax verbatim so anyone who's used dbt has zero ramp.

Unlike dbt, **Converge's graph is partly dynamic.** Seed lets a parent task emit children at runtime, so the descendants of an unseeded Seed parent literally don't exist when the user types `--select 'parent+'`. The proposal handles this with three node states in the manifest (`concrete`, `expected`, `frontier`), `frontier:` / `expected:` selectors that name the regimes, and a `compile --seed` mode that runs Seed scripts (cheap) without running the actual task work (expensive): turning frontiers into concrete subgraphs on demand. See §2 for the full treatment.

```bash
# Today
converge run                          # all tasks
converge run build                    # tasks whose name contains "build"

# v2
converge run --select '03-tokens+'    # 03-tokens and everything downstream
converge run --select 'result:error+' # what failed last time + downstream
converge build --select '@phase:render'  # full subgraph for the render phase
converge list  --select 'state:modified+' --exclude 'status:complete'
```

The smaller, sharper verb set replaces today's intent-based grouping:

| Today | v2 |
|---|---|
| `run`, `plan`, `status`, `verify`, `reset`, `inspect`, `show`, `metrics`, `playbook`, `skills`, `goals`, `migrate`, `cleanup`, `studio` | `run`, `build`, `test`, `compile`, `list` (`ls`), `show`, `inspect`, `metrics`, `docs`, `clean`, `debug`, `deps`, `init`, `seed`, `retry`, `migrate`, `studio` |

Full migration in §10.

## 1. Mental model: playbook = project, task = node

Side-by-side mapping. Once you internalize this, every other decision falls out.

| dbt | Converge |
|---|---|
| project (`dbt_project.yml`) | playbook (`playbook.yml`) |
| model / seed / snapshot / test | task (`TASK.md`) |
| `ref()` / `depends_on` | `depends_on:` in `TASK.md` frontmatter |
| `manifest.json` | `target/manifest.json` (new: see §6) |
| `run_results.json` | `target/run_results.json` (new: see §6) |
| `--select`, `--exclude` | `--select`, `--exclude` (new: see §4) |
| `selectors.yml` | `selectors.yml` (new: see §5) |
| `target/` directory | `.converge/journal/{playbook}/target/` |
| `--state` / `--defer` | `--state` / `--defer` (new: see §8) |
| `state:modified` ladder | `state:modified.{body,frontmatter,checks,inputs,upstream,playbook,drifted}` (new: see §7) |
| `is_incremental()` / `{{ this }}` | `materialization: incremental` + `{{ is_incremental }}` / `{{ this_state }}` (new: see §7.8) |
| `dbt source freshness` | `converge source freshness` (new: see §7.7) |

A Converge playbook is a single dbt-style "project." A repo with multiple playbooks (`landing-page`, `research`, `default`) is multi-project; **selection is always playbook-scoped**. v1 of this proposal does not allow `--select` to cross playbook boundaries: `--playbook=NAME` (or path-based execution, §11) chooses the project, then `--select` works inside it.

## 2. The dynamic-DAG problem

dbt's DAG is static and fully knowable at compile time. Every model exists as a SQL file on disk; `dbt parse` walks them once and writes a complete `manifest.json`. Selection like `model_a+` resolves to a finite set before any execution.

Converge's graph is not like that. **Seed** (work breakdown structure) lets a parent task emit children at runtime, by running a Node script that may read upstream artifacts, call an LLM, or scan the filesystem. At the moment a user types `converge run --select '03-characters+'`, the descendants of `03-characters` literally don't exist yet: they will exist after `03-characters` runs its Seed phase. Treating the graph as static would be a lie.

Three regimes coexist in one playbook. The CLI has to be honest about which is which.

| Regime | Knowable when? | Examples |
|---|---|---|
| **Concrete** | Compile time. Top-level tasks in `playbook.yml` plus all materialized TASK.md files (including children already spawned by a previous run). | `01-define`, `02-visual-spec`, `03-tokens` |
| **Expected** | After one upstream "catalog" task has run. Children's IDs and count are predictable from a manifest the catalog produces (e.g. `tokens-catalog.json`), even though their TASK.md files don't exist yet. | All 50 per-token children of `03-tokens/002-craft` once `001-catalog` has run |
| **Frontier** | Only after the Seed script itself runs. Truly dynamic: the script reads arbitrary state and decides what to spawn. | A Seed that asks an LLM to break a goal into subtasks |

The proposal treats this honestly with three mechanisms:

1. **The manifest is layered.** Every node has a `state` field: `concrete`, `expected`, or `frontier`. An unseeded Seed parent appears in the manifest with a single placeholder edge into "everything this Seed will spawn": that placeholder is one opaque node until seeding resolves it.
2. **Selection is frontier-aware.** Operators like `parent+` that cross a frontier produce a warning, not silent emptiness: *"`03-characters+` includes a frontier (Seed parent `03-characters` is unseeded). Run `converge compile --seed --select 03-characters` first, or pass `--frontier-ok` to proceed without expansion."*
3. **A new `compile --seed` mode resolves frontiers without running the actual work.** It runs only the Seed scripts of selected parents, materializes children to disk, and rewrites the manifest: turning `frontier` nodes into `concrete` ones. Seed scripts can be cheap or expensive; this makes the user opt in per parent.

The **manifest pattern** (an upstream catalog task that emits a structured list, consumed by a downstream Seed: already idiomatic in `examples/game-assets-video`) is how authors move work from `frontier` to `expected`. Selection methods `frontier:` and `expected:` (§4.2) name these regimes directly so users can write things like `--exclude frontier:` to mean "don't try to plan past the unknowns."

What we deliberately don't do:

- **No pre-execution of Seed in `compile` (default).** Compile is cheap; seeding is opt-in via `--seed`.
- **No speculative DAG.** We don't ask the Seed script to "describe what you might spawn." Either you ran the catalog (it's `expected`) or you ran the seed (it's `concrete`). Anything else is `frontier` and is honest about being unknown.
- **No silent matching.** A selection that crosses a frontier always reports it.

## 3. The new command surface

A clean-break v2 verb set. Every command in today's CLI maps to one of these (full table in §10). Verbs are picked to match dbt one-for-one where possible, so users moving between the two don't context-switch.

| Verb | Purpose |
|---|---|
| `converge run` | Execute selected tasks via the convergence loop. Replaces today's `run`. Now takes `--select` instead of a bare positional substring. |
| `converge build` | Run + check + repair selected tasks in dependency order, failing fast on the first uncorrectable structural failure. The "do everything" verb (mirrors `dbt build`). |
| `converge test` | Run only the `checks:` of selected tasks against current state. No task execution, no repair. Useful after manual edits. |
| `converge compile` | Resolve the DAG, write `target/manifest.json` with `concrete` / `expected` / `frontier` node states (§2). No execution by default. With `--seed`, runs Seed scripts of the selected parents to materialize their children, turning `frontier` nodes into `concrete` ones. (Mirrors `dbt compile` / `dbt parse`, plus `--seed` for the dynamic case.) |
| `converge list` (alias `ls`) | Print tasks matching a selection. The "what would run" preview. (Mirrors `dbt ls`.) |
| `converge show` | Visualize: `show graph`, `show gantt`, `show journal`, `show backlog`, `show trend`. Same subcommands as today. |
| `converge inspect` | Drill into a specific session/task/attempt. Same as today. |
| `converge metrics` | Cost / token / model breakdowns. Same as today. |
| `converge docs generate` / `docs serve` | Generate and serve a static HTML docs site for the playbook (DAG, task READMEs, lineage). Mirrors `dbt docs`. |
| `converge clean` | Delete artifacts under `target/` and journal subtrees: surgical alternative to today's `--restart`. Takes `--select`. |
| `converge debug` | Verify config, structure, checkpoint consistency, plugin loading. Replaces today's `verify`. |
| `converge deps` | Install / list skills and plugins declared in `playbook.yml`. Replaces `skills install` / `skills list`. |
| `converge init` | Scaffold a new project. Same as today. `--from-prompt "<goal>"` absorbs today's `plan`. |
| `converge seed` | Materialize fixture inputs declared in `playbook.yml`. Mirrors `dbt seed`. |
| `converge retry` | Resume from the last failure point in `target/run_results.json`. Replaces the "redo failures" intent of today's `--resume`. |
| `converge migrate` | V1 → V2 layout migration. Unchanged. |
| `converge studio` | Web UI. Unchanged. |

Folded:
- `plan` → `compile` (DAG resolution) + `init --from-prompt` (LLM generation).
- `playbook list / info / history` → `list --playbooks`, `inspect playbook NAME`, `show trend --playbook=NAME`.
- `goals` → `build` (project-level checks already exist; goals become checks).
- `cleanup` → `clean --orphaned`.

## 4. The `--select` / `--exclude` DSL

Same syntax as dbt. Every operator below works on every command that takes a selection (`run`, `build`, `test`, `compile`, `list`, `clean`, `docs generate`).

### 4.1 Graph operators

Apply to anything that resolves to a set of tasks.

| Form | Meaning | Example |
|---|---|---|
| `task_id` | Just this task | `--select 03-tokens` |
| `task_id+` | Task + all descendants (downstream) | `--select 03-tokens+` |
| `+task_id` | Task + all ancestors (upstream) | `--select +07-keyframes` |
| `+task_id+` | Task with full lineage | `--select +05-storyboard+` |
| `2+task_id` | Up to 2 hops upstream | `--select 2+10-render` |
| `task_id+3` | Up to 3 hops downstream | `--select 03-tokens+3` |
| `@task_id` | Task + ancestors + ancestors-of-descendants (the full subgraph required to rebuild it from scratch) | `--select @06-storyboard` |
| `*pattern*` | Glob over task IDs | `--select '*keyframe*'` |

The graph these operators traverse is built from `depends_on` declared in each task's TASK.md frontmatter. Seed-spawned children inherit their parent's incoming edges.

### 4.2 Selector methods

Anywhere you can write a `task_id`, you can write a `method:value` selector. The result is the set of tasks matching that method.

| Method | Selects | Example |
|---|---|---|
| `name:` | Tasks whose ID contains the value (default: bare values use this method) | `name:keyframe` |
| `tag:` | Tasks with this tag in `tags:` frontmatter | `tag:image` |
| `path:` | Tasks under this directory in the playbook tree | `path:tasks/keyframes` |
| `phase:` | Tasks with a `phase` tag (sugar for `tag:phase,tag:NAME`) | `phase:render` |
| `status:` | Current journal state: `pending`, `running`, `complete`, `failed`, `blocked` | `status:failed` |
| `result:` | Outcome from the last (or `--state`-pointed) session: `error`, `fail`, `skip`, `pass` | `result:error` |
| `state:modified` | Union of the seven sub-methods below (§7.4). Anything different vs `--state` manifest. | `state:modified+` |
| `state:modified.body` | TASK.md body changed (the agent prompt) | `state:modified.body+` |
| `state:modified.frontmatter` | Outputs / deps / vars / tags changed (excludes the checks block alone) | `state:modified.frontmatter` |
| `state:modified.checks` | Only the `checks:` block changed: re-test, don't re-run | `state:modified.checks` |
| `state:modified.inputs` | An `inputs:` file's content changed | `state:modified.inputs+` |
| `state:modified.upstream` | A direct parent's hash changed | `state:modified.upstream` |
| `state:modified.playbook` | `playbook.yml` (vars / project checks) changed | `state:modified.playbook` |
| `state:modified.drifted` | A declared output's content differs from the hash in the prior `run_results.json` | `state:modified.drifted` |
| `state:new` | Node exists in current manifest, absent in `--state` manifest | `state:new` |
| `seed:` | Seed shape: `parent`, `child`, `seeded`, `unseeded` | `seed:unseeded` |
| `frontier:` | Seed parents whose children are unknown (state = `frontier` in manifest, §2) | `frontier:` |
| `expected:` | Manifest-predicted children that don't exist on disk yet (state = `expected`, §2) | `expected:` |
| `concrete:` | Materialized tasks (state = `concrete`): useful as `--exclude frontier:` complement | `concrete:` |
| `attempt:` | Tasks whose attempt count matches an integer or comparator | `attempt:>=3` |
| `selector:` | Named selector from `selectors.yml` (§5) | `selector:nightly` |

**Interaction with graph operators across a frontier.** `parent+` over an unseeded Seed parent produces a warning, not silent emptiness:

```
$ converge run --select '03-characters+'
warning: '03-characters+' crosses a frontier:
  - 03-characters (Seed, unseeded: children unknown)
hint:    converge compile --seed --select 03-characters
         converge run --select '03-characters+'
or pass: --frontier-ok to run only the concrete portion
abort.
```

`@` over a Seed parent is well-defined as "this parent + its ancestors": descendants you don't know yet aren't included. After seeding, `@` recomputes against the now-concrete subgraph.

### 4.3 Set operators

Mirror dbt exactly so muscle memory transfers.

- **Space = union.** `--select "tag:image phase:render"` → image OR render.
- **Comma = intersection.** `--select "tag:image,status:failed"` → image AND failed.
- **`--exclude`** subtracts after `--select`. `--select tag:image --exclude status:complete` → unfinished image tasks.

Operators bind tighter than `+`/`@` modifiers attach: `tag:image+` is "tasks tagged image, then all descendants."

### 4.4 Quoting

Always quote selection expressions:

```bash
converge run --select '03-tokens+'        # good
converge run --select 03-tokens+          # zsh expands the +; don't
```

`+` is a glob char in many shells, `:` confuses some path-aware shells, and intersections written `a,b` are parsed as one shell word: quoting removes all three foot-guns.

### 4.5 Worked examples

Each example below shows a real intent and the expression that captures it. Run `converge list --select '<expr>'` first to see the resolved set before any execution.

```bash
# Run one task and everything that depends on it.
converge run --select '03-tokens+'

# Re-run only what failed last session, plus everything downstream that's now stale.
converge run --select 'result:error+'

# Build only the keyframe phase, but stop at storyboard (don't re-run the script).
converge build --select '+07-keyframes' --exclude '+04-script'

# Test only the checks of completed tasks (verify nothing drifted on disk).
converge test --select 'status:complete'

# Preview what `state:modified+` actually selects: don't commit yet.
converge list --select 'state:modified+'

# Run anything tagged image AND in the render phase, with full lineage.
converge build --select '@tag:image,phase:render'

# Re-seed every Seed parent that hasn't been seeded yet.
converge run --select 'seed:unseeded' --seed

# Run a named, committed selector (see §5).
converge run --select 'selector:nightly'

# Clean only the keyframes subtree, keep everything else.
converge clean --select '07-keyframes+'
```

## 5. Named selectors (`selectors.yml`)

For complex, reusable expressions. Lives at the playbook root, next to `playbook.yml`. Mirror of dbt's file of the same name.

```yaml
selectors:
  - name: nightly
    description: Image pipeline that runs on schedule.
    definition:
      union:
        - method: tag
          value: image
        - method: phase
          value: render
      exclude:
        - method: status
          value: complete

  - name: failures_with_lineage
    description: Re-run anything that failed last time, with full upstream + downstream context.
    definition:
      method: result
      value: error
      parents: true     # equivalent to prefix `+`
      children: true    # equivalent to suffix `+`
```

Use as `--select selector:nightly` or via the shortcut `--selector nightly`. Why this exists: complex selections belong in version control, not shell history.

## 6. The `target/` artifact directory

Today, dependency resolution is lazy and in-memory; today's journal stores execution state but not a compiled DAG. Proposal: `compile`, `run`, `build`, `list`, and `test` all write to `.converge/journal/{playbook}/target/`. Two artifacts.

### 6.1 `target/manifest.json`

Compiled DAG with explicit node-state honesty for the dynamic case (§2). Schema sketch:

```jsonc
{
  "metadata": {
    "playbook": "default",
    "playbook_hash": "sha256:…",       // sha256 of playbook.yml minus the tasks: list
    "generated_at": "2026-04-30T10:52:54Z",
    "converge_version": "x.y.z",
    "frontier_count": 1                 // unresolved Seed parents (§2)
  },
  "nodes": {
    "01-define": {
      "state": "concrete",          // exists on disk
      "id": "01-define",
      "path": "tasks/01-define/TASK.md",
      "tags": ["phase", "define"],
      "depends_on": [],
      "depended_on_by": ["02-visual-spec"],
      "seed": null,
      "checks": [/* … */],
      "inputs": [/* … */],
      "outputs": ["assets/game.json", "assets/visual-target.png"],
      "frontmatter_hash": "sha256:…",
      "body_hash":        "sha256:…",
      "checks_hash":      "sha256:…",
      "inputs_hash":      "sha256:…",
      "upstream_hash":    "sha256:…"
    },
    "03-tokens/002-craft": {
      "state": "concrete",
      "seed": {
        "type": "nodejs",
        "path": "tasks/03-tokens/002-craft/seed/index.js",
        "preview_manifest": "assets/tokens-catalog.json"  // optional: see §2
      },
      "depended_on_by": ["03-tokens/002-craft#frontier"],
      // …
    },
    "03-tokens/002-craft#frontier": {
      "state": "frontier",          // Seed-pending placeholder
      "id": "03-tokens/002-craft#frontier",
      "seed_parent": "03-tokens/002-craft",
      "depends_on": ["03-tokens/002-craft"],
      "depended_on_by": []          // unknown until seeded
    },
    "03-characters/warrior": {
      "state": "expected",          // catalog predicts it; disk doesn't have it yet
      "id": "03-characters/warrior",
      "seed_parent": "03-characters",
      "predicted_from": "assets/characters-catalog.json"
    }
    // …
  },
  "child_map":  { "01-define": ["02-visual-spec"] },
  "parent_map": { "02-visual-spec": ["01-define"] }
}
```

The `state` field is the single most important addition over a literal port of dbt's manifest. Tools (the editor, `list`, `--select`) read it to know what's safe to plan over.

A Seed parent's TASK.md may declare `seed.preview_manifest:`: a file path produced by an upstream catalog task. When that file exists, `compile` reads it and emits one `expected` node per entry. When it doesn't (or when no preview is declared), the parent emits one `#frontier` placeholder. Authors who want their dynamic graph to be plannable add the `preview_manifest` pointer; authors who can't predict opt out and accept that downstream selection has a frontier.

### 6.2 `target/run_results.json`

Written after every session. One entry per task that was selected. Mirrors dbt.

```jsonc
{
  "metadata": { "session_id": "2026-04-30T10-52-54-1gzfss", "selector": "phase:define+" },
  "results": [
    {
      "id": "01-define",
      "status": "pass",
      "attempts": 1,
      "duration_ms": 12300,
      "output_hashes": {                     // for state:modified.drifted (§7.4)
        "assets/game.json":         "sha256:…",
        "assets/visual-target.png": "sha256:…"
      }
    },
    { "id": "02-visual-spec", "status": "error", "attempts": 3, "duration_ms": 64000, "error": "…" }
  ]
}
```

### 6.3 What this unlocks

- `state:modified`: diff `frontmatter_hash` / `body_hash` against `--state` manifest. **Limited to nodes with state = `concrete` in both manifests.** Modified tasks under a frontier are surfaced as a frontier diff, not a per-child diff.
- `result:error`: read `run_results.json`.
- `--defer`: substitute prior outputs for upstream tasks, only re-run the selection.
- `frontier:` / `expected:` / `concrete:` selection: direct queries against the `state` field.
- Faster `--select` resolution: one JSON load, no journal crawl.
- External tools (the editor app) read one file instead of walking the journal.

## 7. Staleness, freshness, and incremental tasks

This is the part of the proposal that's most directly modeled on dbt. It's also the largest behavioral change for Converge.

### 7.1 What dbt does, distilled

Three orthogonal mechanisms, often confused:

1. **Manifest diff (`state:modified`).** dbt parses the project to a `manifest.json` that captures the *meaning* of each model: body content, configs, materialization, contract, transitively-referenced macros. State diffing compares two manifests and surfaces what changed. **It's a query, not an action.** dbt never decides on its own to re-run anything; the user opts in by writing `--select state:modified+`.
2. **Source freshness (`dbt source freshness`).** Independent of model state. Reads a `loaded_at_field` from each source, compares to `warn_after` / `error_after` thresholds. Tells you if upstream input is stale.
3. **Incremental models (`is_incremental()`).** dbt provides one bit (`is this the first run?`) and a reference to the prior table (`{{ this }}`). The user writes a `WHERE event_time >= (SELECT MAX(event_time) FROM {{ this }})` clause. dbt does not track inserted rows on its own: the watermark is the user's responsibility.

The headline lesson: **dbt separates "is this stale?" (a query) from "what should we re-run?" (a user decision).** Converge today conflates them: the runner mtimes TASK.md, runs cheap re-validation, decides whether to invalidate. The proposal flips that.

### 7.2 What Converge does today (the gap)

From the current codebase:

- **Edit detection is mtime-only.** `recheckEditedCompletedTasks` in `autonomous-run.ts` compares `TASK.md.mtimeMs` to `checkpoint.lastUpdated` with a 2-second slack. No content hashing.
- **Outputs are existence-tracked, not content-tracked.** A missing output reverts a task to pending; an *edited* output is invisible.
- **`.playbook-hash` exists but is dead.** The journal hashes the playbook directory but never uses the result for invalidation.
- **Cheap re-validation is automatic.** On `--resume`, the runner re-runs `checks:` of edited completions and silently reverts them if checks fail. The user can't ask "what's stale?": they can only ask "run."
- **No manifest, no diff.** Every run does a full filesystem rescan.

This works, but it's eager and opaque. The proposal makes it lazy and queryable.

### 7.3 Hash-based identity in the manifest

Every `concrete` node in `target/manifest.json` carries five hashes:

| Hash field | Covers | dbt analogue |
|---|---|---|
| `frontmatter_hash` | TASK.md frontmatter (checks, outputs, deps, vars, tags, seed declaration) | `state:modified.configs` + `.contract` |
| `body_hash` | TASK.md body (the prompt / instructions to the agent) | `state:modified.body` |
| `inputs_hash` | sha256 over the contents of all `inputs:` files, in declared order | (no direct analogue: closest is upstream model body) |
| `checks_hash` | The `checks:` block alone (split out so check-only edits are detectable cheaply) | (no direct analogue: useful for "I just fixed a check") |
| `upstream_hash` | sha256 over the immediate parents' (`frontmatter_hash`, `body_hash`, `inputs_hash`) tuples | how dbt's modified-upstream propagates |

Plus the playbook itself:

- `playbook_hash`: sha256 over `playbook.yml` (excluding the `tasks:` list, which is the DAG itself). Captures `vars`, project-level `checks`, `run` config.

The current `.playbook-hash` file becomes load-bearing: it *is* the `playbook_hash` field of the prior manifest, used for the diff.

### 7.4 The `state:modified` ladder

Mirroring dbt's sub-method ladder. `state:modified` is the union of all of these.

| Method | Triggers when | Use it for |
|---|---|---|
| `state:modified.body` | `body_hash` differs from the manifest at `--state` | "I rewrote the prompt for this task" |
| `state:modified.frontmatter` | `frontmatter_hash` differs (and not just the checks block: see below) | "I changed the outputs / deps / vars" |
| `state:modified.checks` | `checks_hash` differs but nothing else | "I fixed a broken check; don't re-run, just re-test" |
| `state:modified.inputs` | `inputs_hash` differs (an input file's content changed on disk) | "An upstream artifact got rewritten" |
| `state:modified.upstream` | A direct parent's `frontmatter_hash`/`body_hash`/`inputs_hash` changed | "Something earlier in the pipeline moved" |
| `state:modified.playbook` | `playbook_hash` differs | "Project-level vars or checks changed" |
| `state:modified.drifted` | A declared output file's content differs from the hash recorded in the prior `run_results.json` | "Someone hand-edited an artifact this task produced" |
| `state:new` | Node exists in current manifest, absent in `--state` manifest | "I added a task" |

The intent: the user picks how aggressively to invalidate. `--select state:modified.body+` is "redo prompts and downstream"; `--select state:modified.checks` is "just retest, don't redo work"; `--select state:modified+` is the broad sweep.

### 7.5 Recipe: the dbt workflow, in Converge

```bash
# 1. Snapshot the state of the last good run.
cp -r .converge/journal/default/target /tmp/last-good

# 2. Edit some task: say, change a prompt body.
$EDITOR .converge/playbooks/default/tasks/03-tokens/002-craft/TASK.md

# 3. Recompile to refresh the current manifest.
converge compile

# 4. What changed?
converge list --select 'state:modified+' --state /tmp/last-good
# 03-tokens/002-craft   [modified.body]
# 03-tokens/002-craft/grassland-platform-platform-wood   [modified.upstream]
# … 49 more downstream

# 5. Decide. Run only the body-changed root, defer the children to prior outputs.
converge run --select 'state:modified.body' --defer --state /tmp/last-good

# 6. Or just retest a check fix without re-running anything.
converge test --select 'state:modified.checks' --state /tmp/last-good
```

This is the headline win: the *user* says what to invalidate. The runner stops second-guessing.

### 7.6 Cheap re-validation becomes opt-in

Today's automatic re-validation on `--resume` (run checks, silently revert if they fail) goes away as the default. It's surfaced as two explicit verbs:

- `converge test --select <expr>`: run only `checks:` against current disk state, report pass/fail. No invalidation.
- `converge debug --revalidate`: the legacy "test then revert completions if checks fail" behavior, opt-in.

`converge run` no longer second-guesses on its own. The contract is "you told me to run; here's what's pending; I'll execute it." If you want to know what's stale first, `converge list --select state:modified+`.

### 7.7 Source freshness

For tasks whose `inputs:` come from outside the playbook (an API pull, a remote file, a manual upload), borrow `dbt source freshness`. Add a frontmatter block on those tasks:

```yaml
freshness:
  loaded_at: "inputs/raw-shots.json"   # file whose mtime is the load timestamp
  warn_after:  { count: 12, period: hour }
  error_after: { count: 24, period: hour }
```

A new command, `converge source freshness [--select <expr>]`, reads the field and reports `pass | warn | error` per source. Doesn't invalidate downstream: that's the user's call (`--select 'source_status:fresher+' --state ...` mirroring dbt's `source_status` selector). v1 of the proposal documents this; implementation can come later.

### 7.8 Incremental tasks

Some Converge tasks are naturally append-only: a generation task that adds new tokens to a manifest, a frame-rendering task that produces output 042 today and 043 tomorrow. Today there's no first-class way to express "skip work I've already done"; authors hand-roll it inside their skills.

Borrow `dbt is_incremental()`. Add to TASK.md frontmatter:

```yaml
materialization: incremental
unique_key: token_id        # or watermark: rendered_at
```

The agent's prompt template gets two new variables, exactly mirroring dbt's `is_incremental()` and `{{ this }}`:

- `{{ is_incremental }}`: `true` when this task has run before with `materialization: incremental`.
- `{{ this_state }}`: path to the prior outputs (effectively `target/last/outputs/` for this task), or empty on first run.

The agent (or skill, or Seed) is responsible for the actual append logic: read the prior output, compute the watermark, generate only what's new. Same contract as dbt: framework provides the bit and the pointer; user writes the watermark.

### 7.9 Interaction with the dynamic DAG (§2)

Hash-based staleness has a clean answer for `concrete` nodes and a deliberate answer for the rest:

- **`concrete`**: full hash diff applies. All `state:modified.*` methods work.
- **`expected`**: the node has no body or inputs on disk yet. `state:modified` over an `expected` node is defined as "did the predicting catalog change?": i.e., the upstream catalog task's `outputs_hash` for `tokens-catalog.json` differs.
- **`frontier`**: undefined. A frontier has no children to compare. `--select 'state:modified+'` over a frontier produces the same warning as any other operator that crosses one: run `compile --seed` first, or pass `--frontier-ok`.

### 7.10 What we deliberately do not adopt from dbt

- **No automatic invalidation cascade.** dbt doesn't have one and neither will we. Staleness is a fact you query.
- **No `state:older`.** dbt has it for snapshots; Converge has no snapshot concept.
- **No `is_modified()` template helper.** Selection at the CLI is simpler than letting tasks introspect their own state mid-run.
- **No watermark inference.** Like dbt, the user writes the watermark. We provide the bit and the pointer; nothing more.

## 8. Global flags

| Flag | Purpose |
|---|---|
| `--select`, `-s` | Selection expression (§4). |
| `--exclude`, `-e` | Subtractive expression (§4). |
| `--selector` | Shortcut for `--select selector:NAME`. |
| `--playbook=NAME` | Which playbook (required when the project has >1). |
| `--state=PATH` | Path to a prior `target/` for `state:` comparisons. Mirrors `dbt --state`. |
| `--defer` | Use prior outputs from `--state` instead of re-running upstream tasks. |
| `--fail-fast` | Stop on first uncorrectable failure. Default for `build`; opt-in for `run`. |
| `--threads=N` | Parallelism cap. Documented even where today's runtime is single-threaded: naming locked in for future use. |
| `--target=ENV` | Named environment from `playbook.yml` (`dev`, `prod`). Deferred to a follow-up. |
| `--vars='{k: v}'` | Override playbook `vars`. |
| `--project-dir`, `--profiles-dir` | Synonyms for today's `--dir`. dbt-parity aliases. |

## 9. Run-mode flags vs selection flags

Today's `--step`, `--resume`, `--force`, `--dry`, `--preflight` are **run-mode modifiers**, orthogonal to selection. Most survive; the table notes what changes.

| Run-mode flag | Combined with `--select` does what |
|---|---|
| `--step` | Picks the first selectable task and runs one iteration. |
| `--dry` | Prints the would-run plan in selection order. (Replaces today's `--plan`.) |
| `--force` | Bypasses blocked-state guard for the entire selection. |
| `--preflight` | Runs strategy selection for the selection, stops before executing. |
| `--resume` | Default behavior. `converge retry` for explicit "redo failures." `converge debug --revalidate` for the legacy "re-run checks and revert completions if they fail" behavior, which is no longer automatic. |
| `--seed` | Composes with `--select 'seed:…'`. |

## 10. Migration table

Every command in today's CLI mapped to its v2 equivalent. Cross-referenced against `packages/cli/src/main.ts`.

| Today | v2 |
|---|---|
| `converge run` | `converge run` (now takes `--select`) |
| `converge run <substr>` | `converge run --select '<substr>'` (bare value defaults to `name:` method) |
| `converge run --playbook=X` | `converge run --playbook=X` (unchanged) |
| `converge run --restart` | `converge clean --select '<task>+'` then `converge run` |
| `converge run --resume` | `converge run` (resume is default); `converge retry` for redo-failures; `converge debug --revalidate` for re-running checks of completed tasks (no longer automatic: see §7.6) |
| `converge run --dry` / `--plan` | `converge list --select <expr>` (preview) or `converge run --dry` |
| `converge run --preflight` | `converge compile` then `converge run --preflight` |
| `converge run --seed` | `converge run --select 'seed:unseeded' --seed` |
| `converge run --step` | `converge run --select <expr> --step` |
| `converge run --force <substr>` | `converge run --select '<substr>' --force` |
| `converge plan "<goal>"` | `converge init --from-prompt "<goal>"` |
| `converge plan <path>` | `converge compile --select '<path>+'` |
| `converge status` | `converge list --select 'status:*'` (table) or `converge show graph` (visual) |
| `converge status --only-incomplete` | `converge list --exclude 'status:complete'` |
| `converge status --max-depth=N` | `converge list --max-depth=N` |
| `converge reset <pb> <task>` | `converge clean --select '<task>+'` |
| `converge verify` | `converge debug` |
| `converge verify --fix` | `converge debug --fix` |
| (today's automatic re-validation on `--resume` of mtime-edited completions) | `converge debug --revalidate --select 'state:modified+'` (now opt-in: see §7.6) |
| `converge inspect <path>` | `converge inspect <path>` (unchanged) |
| `converge show {gantt,graph,journal,backlog,trend}` | `converge show {gantt,graph,journal,backlog,trend}` (unchanged) |
| `converge metrics` | `converge metrics` (unchanged) |
| `converge playbook list` | `converge list --playbooks` |
| `converge playbook info <name>` | `converge inspect playbook <name>` |
| `converge playbook history <name>` | `converge show trend --playbook=<name>` |
| `converge skills list` | `converge deps list` |
| `converge skills install <skill>` | `converge deps install <skill>` |
| `converge cleanup` | `converge clean --orphaned` |
| `converge migrate` | unchanged |
| `converge studio` | unchanged |
| `converge checkpoint` | `converge inspect checkpoint` |
| `converge plugins` | `converge deps list --plugins` |
| `converge shims …` | unchanged (internal dev shims, not part of the public surface) |
| `converge swebench` | unchanged (benchmark integration, not part of the public surface) |
| `converge tbench` | unchanged (benchmark integration, not part of the public surface) |

## 11. Path-based execution stays

Today's `converge <path> <command>` is a Converge-specific superpower: dbt has nothing like it. Keep it. It composes with `--select`: the path scopes the selection root.

```bash
# Path picks the project; no selection: same as today.
converge .converge/playbooks/research/tasks/02-investigate inspect

# Path picks the project; selection narrows within it.
converge .converge/playbooks/research run --select '+02-investigate+'

# Path picks the task directly; no selection needed.
converge .converge/playbooks/research/tasks/02-investigate run --force
```

## 12. End-to-end example

Walking the `examples/game-assets-video` playbook through the v2 surface. This playbook has the catalog→craft pattern: `03-tokens/001-catalog` produces `tokens-catalog.json`, then `03-tokens/002-craft` is a Seed parent that reads the catalog and spawns ~50 per-token children. It exercises all three regimes from §2.

```bash
# Compile the DAG. No execution. The manifest names every concrete node and
# every frontier honestly.
converge compile
# wrote target/manifest.json
#   concrete:  4   (01-define, 02-visual-spec, 03-tokens/001-catalog, 03-tokens/002-craft)
#   expected:  0   (no catalog has run yet)
#   frontier:  1   (03-tokens/002-craft has seed but tokens-catalog.json doesn't exist)

# Run up through the catalog, but don't seed yet.
converge run --select '+03-tokens/001-catalog'

# Now the catalog exists on disk. Recompile: the frontier collapses into
# concrete predictions.
converge compile
# wrote target/manifest.json
#   concrete:  4
#   expected: 50   (one per entry in tokens-catalog.json, via seed.preview_manifest)
#   frontier:  0

# Preview the per-token work without running anything.
converge list --select '03-tokens/002-craft+'
# 03-tokens/002-craft
# 03-tokens/002-craft/grassland-platform-platform-wood   [expected]
# 03-tokens/002-craft/grassland-platform-platform-stone  [expected]
# … 48 more

# Materialize the children to disk (run only the Seed scripts, not the children).
converge compile --seed --select '03-tokens/002-craft'
# seeded 50 children. all expected → concrete.

# Now run them.
converge run --select '03-tokens/002-craft+'

# Half failed. Re-run failures with full lineage.
converge retry
# (equivalent to: converge run --select 'result:error+')

# Verify checks of completed tasks against current disk state.
converge test --select 'status:complete'

# Reset just the failed tokens.
converge clean --select 'result:error'

# Counter-example: a Seed without a preview manifest. Selection refuses to
# silently match nothing.
converge run --select '03-characters+'
# warning: '03-characters+' crosses a frontier:
#   - 03-characters (Seed, unseeded: children unknown)
# hint:    converge compile --seed --select 03-characters
# abort.

converge compile --seed --select '03-characters'
converge run --select '03-characters+'

# Generate a static docs site.
converge docs generate
converge docs serve --port=8080
```

The key insight: **`compile --seed` is the bridge between the static DAG and the dynamic graph.** It runs Seed scripts (which are typically cheap: read a file, decide what to spawn) but not the actual task work (which is expensive: call an LLM, render an image). Users get a knowable graph at the cost of one cheap pass per Seed parent.

## 13. Open questions

Decide before implementing.

1. **Multi-playbook selection.** Should `--select` ever cross playbook boundaries? Probably no in v1. Revisit when projects routinely have >3 playbooks.
2. **Where does `--state` default to?** Auto-snapshot every successful run to `target/last/`? Or require explicit `--state PATH`? dbt requires explicit; that's friction but it's also unambiguous.
3. **`inputs_hash` cost.** Hashing every declared input on every `compile` is fine for small text files, expensive for large binaries (a 200MB checkpoint). Threshold? Skip hashing files over N MB and fall back to mtime+size? Or trust the user to declare `inputs:` only for things worth hashing?
4. **Auto-seed on `run`?** Should `converge run --select '03-characters+'` automatically run `compile --seed` if the selection crosses a frontier (after a confirmation prompt), or always require an explicit `compile --seed` first? The proposal currently says "always require explicit." That's the safe default but adds friction.
5. **`seed.preview_manifest` schema.** When a Seed declares it, what's the contract? Just a list of `{id, vars}` records? Or a richer shape that matches the children's eventual TASK.md frontmatter? Lock this down before code is written.
6. **Recursive Seed frontiers.** If an `expected` child is itself a Seed parent (rare today, but supported), its grandchildren are doubly-frontier. Should the manifest model this as nested frontiers, or flatten?
7. **Idempotency under `--seed --inc`.** Today's `--inc` re-runs Seed but doesn't wipe old child journals; the Seed script handles dedup. Does `compile --seed --inc` keep this behavior? What does it do when the catalog has *removed* an entry that previously spawned a child?
8. **`--defer` across a frontier.** A deferred run uses prior outputs for upstream tasks. If "upstream" includes a frontier, do we defer the frontier wholesale (use prior children's outputs) or refuse?
9. **`--defer` storage layout.** Where do prior outputs live so a deferred run can read them? Per-session `target/`? A `target/latest` symlink? A user-configurable directory?
10. **`is_incremental` and the agent contract.** Skills receive a templated prompt today. Are `{{ is_incremental }}` and `{{ this_state }}` automatically injected for every task with `materialization: incremental`, or does the skill have to opt in? Where do we draw the line on prompt boilerplate?
11. **Drift detection cost.** `state:modified.drifted` requires re-hashing every declared output to compare against `run_results.json`. Is this default-on (slow but honest) or opt-in?
12. **Parallelism.** `--threads` is documented above but the runtime is largely sequential today. Either wire it up or strike it from v2.
13. **Selector AST.** String parser only, structured YAML only, or both (CLI = string, `selectors.yml` = structured)? dbt does both and it works. Mirror that.
14. **`name:` as default method.** Should `--select 'foo'` mean `name:foo` (substring) or fail unless you write the method explicitly? Substring is the migration-friendly default.

## 14. What this proposal deliberately does NOT include

- Implementation. No changes to `packages/cli/src/main.ts`.
- A backwards-compat shim layer. The user picked clean break; the migration table (§10) is the compatibility story. Old commands print a one-line redirect with the v2 equivalent for one release, then are removed.
- Decisions on §13: those are punted to review.
- A new project-level config concept (`profiles.yml`). `playbook.yml` already covers what dbt splits into project + profile.
- ADR / RFC numbering. Converge uses `docs/design/`; this fits there.
