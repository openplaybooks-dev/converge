---
title: "Generate something repeatedly"
description: "Sequential pipelines and per-item fan-outs. Anchored on the data-pipeline and cinematic-video-production examples."
sidebar:
  order: 2
---
# Generate something repeatedly

The most common Converge shape: "I want to produce N copies of an artifact" or "I want to produce X every time the inputs change". Converge handles two distinct patterns for this: a **sequential pipeline** and a **per-item fan-out**: and the right choice depends on whether one run produces one output or one run produces N outputs.

## The two shapes

### Sequential pipeline: fetch → transform → validate

One run produces one output. Each phase consumes the previous phase's output. The pipeline is a single chain; advancing any phase re-runs everything downstream.

### Per-item fan-out: one task per input item

One run produces N outputs. A parent task reads a manifest (a CSV, a JSON array, a shots list), then spawns one child task per item. Each child produces one artifact. The parent task is the unit of scaling.

---

## Pipeline shape (anchored on `data-pipeline`)

The canonical pipeline is in `examples/data-pipeline/`. The playbook has three tasks in a strict chain:

```
fetch-data → transform → validate
```

### The playbook

Read `examples/data-pipeline/.converge/playbooks/default/playbook.yml`:

```yaml
tasks:
  - path: fetch-data
  - path: transform
  - path: validate
```

Each task's `outputs:` becomes the next task's `inputs:`. Converge's storage layer tracks this automatically: when `transform` runs, it reads the files written by `fetch-data`. When `validate` runs, it reads the files written by `transform`. You never pass file paths manually; Converge resolves them from the dependency graph.

### Task phases

The pipeline has three distinct phases:

- **fetch-data**: pulls raw data from a source. This is the only task that knows where data comes from.
- **transform**: enriches or reformat the data. It reads `fetch-data`'s output; it knows nothing about the source.
- **validate**: checks the final output. If validation fails, the pipeline stops and you get a check failure report.

### Changing the data source

Edit `tasks/fetch-data/TASK.md` to point at your own endpoint, file path, or API call. Everything downstream just works because the storage layer enforces the contract between phases. The dependency chain also means that if you change the fetch task, only the transform and validate phases re-run: fetch-data's output is cached.

### Re-running and resuming

`converge run` picks up from the last completed phase without re-running already-good outputs (resume is the default). If a later phase fails, fixing it and re-running avoids re-fetching or re-transforming clean data. Use `converge retry` to explicitly re-run only failures.

---

## Fan-out shape (anchored on `cinematic-video-production`)

The canonical fan-out is in `examples/cinematic-video-production/`. It produces one shot artifact per entry in `shots.json`: one run, many outputs. This is the right pattern when your input is a list: a CSV of leads, a JSON array of products, a shot list from a breakdown.

### The `mode: spawner` pattern

A **spawner** task declares `mode: spawner` and writes one JSONL row per child to `$CONVERGE_TASK_DIR/spawn.plan.jsonl`. The framework runs `converge apply` after the body. For each row, Converge renders a copy of the referenced template `TASK.md` with the row's `vars`.

The template lives at `templates/<thing>/TASK.md`. The row's `vars:` (and any auto-injected vars) are substituted into the template's body and frontmatter at render time.

From the storyboard example:

```yaml
# tasks/06-storyboard/TASK.md
---
id: 06-storyboard
mode: spawner
spawn:
  template: .converge/playbooks/default/templates/storyboard
  min_children: 1
---

```bash
jq -c '.[] | {id:("shot-"+.shot_id), template:".converge/playbooks/default/templates/storyboard", vars:.}' \
  shots.json > "$CONVERGE_TASK_DIR/spawn.plan.jsonl"
```
```

The body reads `shots.json` and emits one row per shot. The framework calls `converge apply` after the body; for each row the template gets rendered with that row's vars as a new child task.

### Template substitution

Inside a spawner template `TASK.md`, variable substitution pulls fields from the manifest row's `vars:`:

```
{{shot_id}}    → e.g. "001-establishing-wide"
{{prompt}}     → the generation prompt for this shot
{{sequence}}   → the scene sequence number
```

Converge renders one copy of the template per item, producing one task per shot. The output is one file per item, not one aggregated file for the whole run. Each child task runs independently and writes its own output files.

### Per-item vs. per-run

The key distinction: in a pipeline, one run produces one output and the phases share state through files. In a fan-out, one run produces N outputs: one per item in the manifest: and each child task is independent. You would use a fan-out when each output is self-contained and doesn't need to be merged back into a single artifact.

### Cadence: running on a schedule

Converge runs imperatively: `converge run` executes once and exits. There is no built-in scheduler. Wrap it in `cron`, a GitHub Actions `schedule` trigger, or your CI system's timed trigger. A typical pattern: push to main triggers the run; a cron job runs it nightly; or a webhook from your data source fires the run whenever the input list changes.

For resume semantics (picking up from the last completed task rather than restarting from scratch: now the default behavior), see [`/reference/cli/run`](/reference/cli/run). With `mode: spawner` fan-out, a resumed run will skip any child task whose output already exists: useful for resuming a partially-completed run.

### Where to go next

- [Examples gallery](/docs/examples/): browse for the closest match to your use case. Every example has a `playbook.yml` you can read directly.
- [Customize an example](/guides/customize-an-example): once you've copied one, what to edit first: usually the fetch task and the output path.
- [Concepts: dynamic work-breakdown](/concepts/dynamic-work-breakdown): how `mode: spawner` spawns one task per item and how each child's checks compose into a recursive contract.
