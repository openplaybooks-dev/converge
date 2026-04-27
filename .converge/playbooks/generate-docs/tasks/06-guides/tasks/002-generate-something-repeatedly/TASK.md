---
id: 002-generate-something-repeatedly
title: Write docs/guides/generate-something-repeatedly.md
inputs:
  - examples/data-pipeline/README.md
  - examples/data-pipeline/.converge/playbooks/default/playbook.yml
  - examples/cinematic-video-production/README.md
  - examples/cinematic-video-production/.converge/playbooks/default/playbook.yml
  - packages/core/src/storage/types.ts
outputs:
  - docs/guides/generate-something-repeatedly.md
checks:
  - id: page-exists
    cmd: "test -f docs/guides/generate-something-repeatedly.md"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 docs/guides/generate-something-repeatedly.md | grep -q '^title:' && head -10 docs/guides/generate-something-repeatedly.md | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: anchored-on-real-example
    cmd: "grep -qE 'data-pipeline|cinematic-video-production' docs/guides/generate-something-repeatedly.md"
    description: page anchors on a real example from the gallery
  - id: shows-wbs-or-template-pattern
    cmd: "grep -qiE 'wbs|template|per-item|per item|each item|loop' docs/guides/generate-something-repeatedly.md"
    description: shows the pattern for one-task-per-input-item
  - id: word-count-ok
    cmd: "test -f docs/guides/generate-something-repeatedly.md && wc -w docs/guides/generate-something-repeatedly.md | awk '{exit ($1>=700&&$1<=1500?0:1)}'"
    description: 700-1500 words
---

# Write `docs/guides/generate-something-repeatedly.md`

The most common Converge shape: "I want to produce N copies of an
artifact" or "I want to produce X every time the inputs change". A
sequential pipeline (fetch → transform → validate) or a per-item
fan-out (one task per row in a CSV).

## Required frontmatter

```yaml
---
title: "Generate something repeatedly"
description: "Sequential pipelines and per-item fan-outs. Anchored on the data-pipeline and cinematic-video-production examples."
sources:
  - examples/data-pipeline/README.md
  - examples/data-pipeline/.converge/playbooks/default/playbook.yml
  - examples/cinematic-video-production/README.md
  - examples/cinematic-video-production/.converge/playbooks/default/playbook.yml
sidebar:
  order: 2
---
```

## Required structure

1. **The two shapes.**
   - **Sequential pipeline** — fetch → transform → validate. One run
     produces one output. (Anchor: `data-pipeline`.)
   - **Per-item fan-out** — for each item in an input list, produce one
     artifact. One run produces N outputs. (Anchor:
     `cinematic-video-production`, which fans out per shot.)

2. **Pipeline shape (anchored on `data-pipeline`).**
   Walk the reader through the example:
   - `examples/data-pipeline/.converge/playbooks/default/playbook.yml` —
     read it, name the phases.
   - Show how `depends_on:` chains the phases.
   - Show the `outputs:` of each phase being the `inputs:` of the next.
   - Note where the reader would change the example to point at their
     own data source.

3. **Fan-out shape (anchored on `cinematic-video-production`).**
   - Show the WBS pattern: `wbs:` block in the parent task, `wbs/index.js`
     reading a manifest, spawning one child per item.
   - Show the template under `wbs/templates/<thing>/tasks/{{slug}}/TASK.md`
     with `{{var}}` substitution.
   - Note where the reader would change the example to point at their
     own input list.

4. **Cadence — running it on a schedule.**
   - Converge runs imperative for now (no built-in scheduler). Wrap
     `converge run` in `cron`, GitHub Actions, or your scheduler of
     choice. Link to `/reference/cli/run` for `--resume` semantics.

5. **Where to go next.**
   - [Examples gallery](/examples/) — browse for the closest match.
   - [Customize an example](/guides/customize-an-example) — once
     you've copied one, what to edit first.
   - [Concepts: filesystem-as-plan](/concepts/filesystem-as-plan) — why
     the fan-out output is one file per item.

## Read first

- `examples/data-pipeline/README.md` and the playbook — the canonical
  pipeline shape.
- `examples/cinematic-video-production/README.md` and the playbook —
  the canonical fan-out shape.
- `packages/core/src/storage/types.ts` — confirm the `wbs:` block schema.

## Banned

- Inventing example names that aren't in `docs/_examples.json`.
- Generic "how to think about pipelines" content. This page is anchored
  on two real examples; everything ties back.
- Documenting WBS internals at the level a framework-developer would care
  about. The reader is a user, not a contributor — keep WBS at the
  "you point it at a manifest, it spawns one task per item" level.
