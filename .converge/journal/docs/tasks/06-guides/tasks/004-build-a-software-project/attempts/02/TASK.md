# Task: 06-guides/004-build-a-software-project

# Write `docs/guides/build-a-software-project.md`

Building runnable software with Converge. The reader is a developer (or
working with one) who wants the framework to drive a real codebase to a
working state — apps, websites, game asset pipelines.

This is the densest guide. It's the place a technical reader lands when
they want the "how do I write a real playbook" answer.

## Required frontmatter

```yaml
---
title: "Build a software project"
description: "Use Converge to drive a real codebase to a working state. Anchored on flutter-app, fullstack-app, stitch-to-flutter."
sources:
  - examples/flutter-app/README.md
  - examples/fullstack-app/README.md
  - examples/stitch-to-flutter/README.md
  - examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml
  - packages/core/src/storage/types.ts
sidebar:
  order: 4
---
```

## Required structure

1. **The shape**. Software playbooks differ from research / fan-out
   playbooks in three ways:
   - **Type-checks and builds are checks.** `tsc --noEmit`,
     `dart analyze`, `pnpm build` — they all return 0 on success.
   - **The repo is the output.** Files live in `src/`, `lib/`, etc., not
     in `out/`.
   - **Long-running.** Many phases, each with sub-tasks. WBS templates
     for things like "one task per screen" or "one task per route".

2. **Anatomy of a real software playbook.** Read
   `examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml`
   and walk through:
   - `name`, `description`.
   - `run` block — `mode`, `maxIterations`, `resume`, `stall`.
   - `tasks:` with `depends_on:` for phase ordering.
   - `checks:` for global validation (e.g. typecheck-clean).

3. **Phases vs leaves.** Naming conventions:
   - Phases: `NN-slug` (e.g. `01-vendor`, `02-design-system`).
   - Leaves: `NNN-slug` (e.g. `001-pick-base`).
   - One `TASK.md` per directory. Sub-tasks live under `tasks/`.
   - Parent tasks: minimal frontmatter. Leaves: full frontmatter
     (`outputs:`, `checks:`, `inputs:`).

4. **WBS for "one per screen / one per route".** The
   stitch-to-flutter playbook spawns one task per screen via WBS. Show
   the pattern at the level of: there's a manifest, there's a
   `wbs/index.js`, there's a template directory with `{{var}}`
   substitution. Defer schema-level detail to the [TASK.md
   reference](/reference/task-md).

5. **Checks that work for software.** Specific patterns:
   - Existence: `test -f path/to/Component.tsx`.
   - Type-clean: `pnpm --filter @app typecheck` (note: pre-existing
     errors will block — link to the
     [troubleshooting page on vendored typecheck errors](/troubleshooting/typecheck-errors-in-vendored-code)).
   - Build passes: `pnpm --filter @app build`.
   - Negative: `test -z "$(grep -rl 'TODO' src/)"`.

6. **Anti-patterns.** Three:
   - **Mixed-shape tasks** — file creation + tree-wide cleanup in one
     task. Slow to converge. Link to the
     [troubleshooting page on mixed-shape tasks](/troubleshooting/mixed-shape-task).
   - **Long-running E2E inside an attempt** — `pnpm dev` + curl + kill
     deadlocks. Link to the relevant troubleshooting page.
   - **All-or-nothing typecheck on a vendored codebase** — see above.

7. **Where to go next.**
   - [Examples gallery → software](/examples/) — find the closest match.
   - [Customize an example](/guides/customize-an-example) — the field-by-field
     walk through editing a copied example.
   - [Reference: playbook.yml](/reference/playbook-yml) — schema-level
     detail.
   - [Reference: TASK.md](/reference/task-md) — leaf vs parent vs WBS.

## Read first

- `examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml` —
  the canonical software playbook. Quote 5-10 lines.
- `examples/flutter-app/README.md`, `examples/fullstack-app/README.md`,
  `examples/stitch-to-flutter/README.md` — for variant context.
- `packages/core/src/storage/types.ts` — verify `PlaybookConfigSchema`
  fields before claiming them.

## Banned

- Inventing schema fields. Verify against
  `packages/core/src/storage/types.ts`.
- Showing a "from scratch" playbook. The reader copies an example;
  this guide explains how to read one, not how to design one ex nihilo.
- Recommending `--no-verify` or `--restart` as a normal workflow. They
  exist for emergencies; they live in Troubleshooting.