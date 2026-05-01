---
title: Runtime and manifest read declarative loader; spawning-seed children get parent edges decoupled from path
description: |
  Wire the runtime to consume the declarative loader's output when the
  flag is set. Update the manifest writer so parent-child edges come
  from declarations, not directory nesting. Spawning-seed children
  (dbt-paradigm) get registered in the path registry with parent edges
  recorded — children can live anywhere on disk and still link to
  their parent through the manifest.

inputs:
  - docs/design/declarative-discovery.md
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/config/path-registry.ts
  - packages/core/src/runtime/runtime.ts
  - packages/core/src/runtime/seed-spawner.ts
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/manifest

outputs:
  - packages/core/src/runtime/runtime.ts
  - packages/core/src/runtime/seed-spawner.ts
  - packages/core/src/manifest
  - packages/core/tests/runtime/declarative-runtime.test.ts
  - packages/core/tests/manifest/declarative-manifest.test.ts
  - packages/cli/tests/integration/spawned-child-anywhere.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck after runtime wiring.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass with flag off.
  - id: tests-green-with-flag
    cmd: CONVERGE_DECLARATIVE_DISCOVERY=1 pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass with flag on.
  - id: spawned-child-location-independent
    cmd: pnpm --filter @converge/cli test -- spawned-child-anywhere
    description: A spawning seed can materialize a child at a custom path and the manifest still links it to the parent.
  - id: manifest-edges-from-declarations
    cmd: pnpm --filter @converge/core test -- declarative-manifest
    description: Manifest parent_map and child_map come from children: declarations, not from path nesting.
  - id: multi-parent-supported
    cmd: pnpm --filter @converge/core test -- declarative-manifest -- multi-parent
    description: A child id appearing in two parents' children: lists is recorded as having two incoming edges.

skills: []
references:
  - "docs/design/declarative-discovery.md"
  - "docs/design/cli-redesign.md"

vars: {}
dependencies:
  - 03-declarative-loader
---

# 04 — Runtime and manifest

This phase makes the declarative loader load-bearing under the flag.

## What lands

### Runtime wiring

`packages/core/src/runtime/runtime.ts`:
- When flag is on, consume the loader's output (which already routes
  through the declarative loader from phase 03). The runtime does not
  itself check the flag — the loader's contract is unchanged: return a
  LoadedPlaybook. The runtime walks the parent_map / child_map from
  the manifest, which the manifest writer fills in from declarations.
- Spawning-seed children: when `seed-spawner.ts` produces a list of
  children, register each in the path registry. If the seed entry has
  an explicit `path:`, use it; otherwise default to
  `<parent-dir>/_spawned/<id>/TASK.md`. Synthesize the TASK.md at that
  path via `child-synthesizer.ts` (from dbt-paradigm).
- Record the parent-child edge in the manifest regardless of where the
  child lives. The edge is a manifest fact, not a filesystem fact.

### Manifest writer updates

`packages/core/src/manifest/*`:
- `parent_map` and `child_map` come from declarations, not from path
  nesting:
  - For each parent task, edges to every id in `children:`.
  - For each parent with `from_seed:`, edges to every spawned child id
    (after spawning) or to a single `#frontier` placeholder (before
    spawning, mirroring cli-redesign §2).
- Each node carries its `path` field as metadata, which may be
  arbitrary post-spawn.
- Optionally serialize the path registry under `metadata.registry` for
  tooling.

### `seed-spawner.ts` integration

Extend `packages/core/src/runtime/seed-spawner.ts`:
- After running the seed body, for each entry `{ id, vars, path? }`:
  - Resolve `path` as above.
  - Call `child-synthesizer.synthesize(parent, entry, path)`.
  - Register `id → path` in the path registry.
  - Add a parent → id edge to the manifest's child_map.

The dbt-paradigm version of `seed-spawner.ts` already does most of
this; this phase adds the **path-can-be-anywhere** behavior and the
explicit manifest-edge recording.

## TDD

Specific must-have tests:
- A static parent's manifest edges match its `children:` declaration
  exactly (no folder-scan inference).
- A multi-parent child (two parents claim id `shared-task`) has two
  incoming edges in the manifest.
- A spawning seed with `path: tasks/_pool/<id>/TASK.md` materializes
  the child there and the manifest still records the parent edge.
- `from_seed:` parent before seeding has manifest state `frontier`;
  after seeding, has `concrete` children, regardless of their disk
  location.
- Cross-loader parity test from phase 03 still passes after this
  phase's manifest writer changes (i.e., flag-off folder-scan and
  flag-on declarative produce identical manifests for the fixture).

## Out of scope

- Per-playbook migration (phase 05).
- Folder-scan deletion (phase 06).

## Done when

All six checks pass. Spawning-seed children can live anywhere on disk
and the manifest correctly links them to their parent. Multi-parent
edges work. The flag-on path runs the runtime and produces a manifest
matching the flag-off path for the fixture.
