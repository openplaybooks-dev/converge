---
title: "dbt shaped Converge"
description: "The initial design decision: concepts adopted from dbt, where the analogy stops working, and the open questions under review."
sidebar:
  order: 7
---

## The decision in one sentence

When we sat down to design Converge, the question wasn't "what should an agent framework look like": it was "what existing tool already solved problems shaped like ours, and how much of its mental model can we adopt without forcing the analogy?"

The answer was **dbt**.

This page is the design rationale: why dbt was the reference point, which concepts we adopted, where the analogy stops working, and the open questions under review. Converge is `v0.1.0`, pre-1.0, no users yet: the runtime primitives (playbooks, tasks, dependencies, Seed, the journal) are in place; the dbt-shaped CLI ergonomics are in active development. The full proposal lives in [`docs/design/cli-redesign.md`](../design/cli-redesign.md).

If you've never used dbt: it's the open-source SQL transformation tool that turned ad-hoc analytics scripts into version-controlled projects. Models, tests, dependencies, and a CLI to run, test, and select subsets of them. You don't need to know dbt to read this page: we're explaining why we studied it.

## 1. Why dbt as the reference point

The instinct when designing an agent orchestration tool is to look at other agent orchestration tools: LangGraph, AutoGen, CrewAI, Prefect-with-AI. We did look. The problem: those tools answer "how do I wire steps together?" None answer "what does a *project* of agent work look like, and how do I run a subset of it?"

We considered three reference families:

- **Generic workflow runners (Airflow, Prefect, Dagster).** These orchestrate code you write. They have no opinion about what a node *is*, what *done* means, or how to *test* a node. Adopting their mental model would have left every primitive: task shape, dependency model, verification: to be re-invented per playbook.
- **Build systems (Bazel, Make).** Closer fit: they have a notion of inputs, outputs, and incremental builds. But the unit of work is a compilation step, not an open-ended task. The "what's stale?" question is mtime-based, which falls apart for LLM-produced artifacts.
- **dbt.** Opinionated about every layer. A node is a SQL `SELECT`. *Done* is "the target table matches the SELECT." *Test* is a `SELECT` that returns 0 rows. The opinionatedness is the point: it provides a vocabulary (model, source, ref, test, manifest) and a workflow (`compile`, `run`, `test`, `build`, `--select`) that's been load-tested by tens of thousands of analytics teams across a decade.

The argument for dbt as the model: **agent workflows have the same shape as data transformations**. A task is a transformation: given inputs, produce outputs that satisfy checks. Dependencies form a DAG. State is materialized to durable storage. The output is verified, not vibes-judged.

The wrong analogy would be "agent framework = generic workflow runner." The right one is "agent framework = opinionated transformation tool, where the transformation engine is an LLM instead of a SQL planner." The agent's role is dbt's SQL planner. Everything else is the same problem.

## 2. Concepts we adopted, and why each one matters

The mapping below mirrors `docs/design/cli-redesign.md:39–53`. Each row exists because the dbt concept solves a problem agent frameworks otherwise solve badly: not because the names look nice.

| dbt concept | Converge concept | Why it matters in agent work |
|---|---|---|
| project (`dbt_project.yml`) | playbook (`playbook.yml`) | A workspace with shared config, vars, and a known root. Without it, every task has to re-declare what scope it lives in. |
| model / seed / test | task (`TASK.md`) | Atomic unit of work with declared inputs, outputs, and checks. "A task" is a richer noun than "a step." |
| `ref()` / `depends_on` | `depends_on:` in `TASK.md` | Explicit edges declared per-task. Order is computed from the DAG, not inferred from a list position or a `before:` hint. |
| `manifest.json` | `target/manifest.json` *(proposed)* | The compiled DAG as data. Tools: the editor app, CI, `--state` comparison: read one JSON file instead of walking the journal. |
| `--select` / `--exclude` | `--select` / `--exclude` *(proposed)* | Composable subset selection. `--select '03-tokens+'` means "this task and everything downstream." It's a *language* for talking about subsets of work, not a feature flag. |
| `state:modified` | `state:modified.{body,frontmatter,checks,inputs,upstream,playbook,drifted}` *(proposed)* | Hash-based diff against a prior manifest, with sub-methods to invalidate aggressively (`.body+`) or surgically (`.checks` only). Mtime guessing produces false positives every time a file is opened in an editor. |
| `is_incremental()` / `{{ this }}` | `materialization: incremental` *(proposed)* | Append-only tasks: skip work already done. The framework provides only "is this the first run?" and a pointer to prior outputs: the playbook author writes the watermark. |

The unifying thread: each concept turns something that was *implicit and ad-hoc* in typical agent code into something *explicit and queryable*. A pre-dbt analytics team wrote SQL scripts and remembered which to run when. Typical agent code writes prompts and hopes the author remembers what's stale. dbt's contribution wasn't the SQL: it was the project shape around the SQL. That's what we're after.

The full mapping from interim CLI verbs to the target surface lives in `docs/design/cli-redesign.md:538–580`.

## 3. Where dbt's analogy stops working

The honest section. dbt and Converge are not the same tool, and pretending the analogy is 1:1 produces worse design than acknowledging the gap.

### dbt's DAG is fully static; Converge's is partly dynamic

dbt parses the project once and writes a complete `manifest.json`. Every model exists as a SQL file on disk. Selection like `model_a+` resolves to a finite set before any execution runs.

Converge's graph isn't like that. **Seed** (work breakdown structure) lets a parent task emit children at runtime, by running a Node script that may read upstream artifacts, call an LLM, or scan the filesystem. At the moment someone types `converge run --select '03-characters+'`, the descendants of `03-characters` literally don't exist yet: they will exist after `03-characters` runs its Seed phase.

Treating the graph as fully static would be a lie. The proposal handles this with three node states in the manifest (`docs/design/cli-redesign.md:62–82`):

- **Concrete.** Knowable at compile time. Top-level tasks plus all materialized `TASK.md` files.
- **Expected.** Knowable after one upstream catalog task has run. The catalog produces a structured list (e.g., `tokens-catalog.json`); the manifest reads it and predicts children's IDs without their `TASK.md` files existing yet.
- **Frontier.** Knowable only after the Seed script itself runs. Truly dynamic: no prediction possible.

Selection is frontier-aware. `parent+` over an unseeded Seed parent produces a warning, not silent emptiness. A `compile --seed` mode runs only the Seed scripts of selected parents (cheap) without running the actual task work (expensive), turning `frontier` nodes into `concrete` ones. The result: a knowable graph at the cost of one cheap pass per Seed parent.

For the worked example of moving frontiers → expected → concrete, see `examples/game-assets-video` and the §12 walkthrough in the design doc.

### Things we considered and didn't adopt

Five non-borrows worth naming, so the design choices are visible rather than assumed:

- **No SQL.** Tasks are markdown + frontmatter + an LLM, not SQL. The agent is the planner. dbt's compile step is template expansion; ours would be agent invocation, which is too expensive to run on every plan.
- **No automatic invalidation cascade.** Like dbt, staleness is a *query*, not an action. The runner doesn't decide on its own to re-run; the playbook author runs `--select state:modified+`. The interim runtime conflates the two: `recheckEditedCompletedTasks` in `autonomous-run.ts` mtime-checks and silently reverts. The target design makes that opt-in (`docs/design/cli-redesign.md:449–456`).
- **No watermark inference for incremental tasks.** Like dbt, the playbook author writes the watermark. The framework provides only `{{ is_incremental }}` and `{{ this_state }}`: a bit and a pointer. Inferring "what's new since last run?" automatically would require introspecting LLM outputs, which is a hard problem we don't need to solve.
- **No `state:older`, no `is_modified()` template helper.** dbt has both; we don't. Selection is a CLI concern, not something tasks should introspect mid-run.
- **No speculative DAG.** We don't ask the Seed script to "describe what you might spawn." Either the catalog has run (the children are `expected`) or the seed has run (they're `concrete`). Anything else is `frontier` and is honest about being unknown. Pretending otherwise breaks `--select` semantics.

## 4. Where the design is now

Converge is `v0.1.0` and pre-1.0. To be explicit about what's in place and what's still being built:

**In place today:**

- Playbook structure (`playbook.yml`, `TASK.md` tree, dependencies, Seed).
- Runtime: the convergence loop, the navigator graph, repair strategies, the journal.
- An interim CLI: `run`, `plan`, `status`, `verify`, `inspect`, `show`, `metrics`, `migrate`, `studio`. Selection is a single positional substring filter.

**Designed in [`docs/design/cli-redesign.md`](../design/cli-redesign.md), not yet built:**

- The `target/manifest.json` and `target/run_results.json` artifact files.
- The `--select` / `--exclude` DSL with graph operators (`+`, `@`, `*`) and selector methods.
- The `compile` verb (and `compile --seed` for the dynamic-DAG case).
- The `state:modified` ladder of seven sub-methods.
- The `materialization: incremental` task type and `is_incremental` / `this_state` template variables.
- `selectors.yml` and `--state` comparison.

The gap is deliberate: the *shape* of the project is real (project-shaped, DAG-driven, journal-backed); the *ergonomics* of operating on it are what comes next. The interim substring filter is a placeholder, not the target. The full design lives in `docs/design/cli-redesign.md`: open for review and counter-proposals.

## 5. Open questions and trade-offs

The design doc closes with fourteen open questions (`docs/design/cli-redesign.md:663–679`). The ones most likely to affect playbook authors:

1. **Auto-seed on `run`?** Should `converge run --select '03-characters+'` automatically run `compile --seed` if the selection crosses a frontier (after a confirmation prompt), or always require an explicit `compile --seed` first? Current draft: always require explicit. Safer default; adds friction.

2. **`inputs_hash` cost on large binaries.** Hashing every declared input on every `compile` is fine for small text files, expensive for a 200MB checkpoint. Threshold and fall back to mtime+size? Or expect playbook authors to declare `inputs:` only for things worth hashing?

3. **Where does `--state` default to?** Auto-snapshot every successful run to `target/last/`, or require explicit `--state PATH`? dbt requires explicit; that's friction but unambiguous.

4. **`--defer` across a frontier.** A deferred run uses prior outputs for upstream tasks. If "upstream" includes a frontier, do we defer the frontier wholesale (use prior children's outputs) or refuse?

5. **Drift detection cost.** `state:modified.drifted` requires re-hashing every declared output to compare against `run_results.json`. Default-on (slow but honest) or opt-in?

6. **`name:` as default method.** Should `--select 'foo'` mean `name:foo` (substring match), or fail unless the method is written explicitly? Substring is the friendlier default; explicit is the dbt-correct one.

These aren't blockers: they're real trade-offs. The design is open to counter-proposals shaped by real playbook needs. The full list lives in §13 of the design doc.

## What this page is not

- **Not a migration guide.** Nothing to migrate from: Converge is pre-1.0 and this is the initial design.
- **Not a comparison with other agent frameworks.** That's [`docs/comparisons.md`](../comparisons.md).
- **Not a how-to for the CLI.** When the dbt-shaped CLI lands, that documentation will live in [Reference](../reference/) and [Guides](../guides/). This page is about the *thinking* behind the design, not how to use it.

The whole point of the [Advanced](./README.md) section is that nothing is asserted; everything is referenced. If a claim on this page disagrees with `docs/design/cli-redesign.md` or with the code in `packages/`, the source documents are right and the page is stale: open an issue.
