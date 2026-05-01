# PLAN — declarative-discovery (root)

## Goal restatement

Replace folder-scan task discovery with a declarative DAG. The loader
walks the declaration tree from `playbook.yml` roots and never scans
`tasks/` directories. Each `TASK.md` declares its children. Spawning
seeds (from dbt-paradigm) emit dynamic children that link to their
parent via a manifest edge, regardless of where the child lives on disk.

The result: a logical graph at any scale, deterministic and constructable
without filesystem walking.

## Decision

CONTAINER. Six children, ordered. Each gates the next on
`pnpm -r typecheck && pnpm -r test`. Strict red-green-refactor at every
leaf for additions; inverted red-green for the folder-scan deletion.

## Pattern (from converge-planning §3)

**Lifecycle Pipeline.** Schema → loader → runtime/manifest → migration →
strip + docs. The phases produce qualitatively different results; each
gates the next. WBS-style fan-out lives inside phase 05 (per-playbook
migration), and uses **spawning seeds from dbt-paradigm** (legacy WBS no
longer exists).

## Why these phases (not others)

- **`01-survey-and-discovery-spec`** — design doc
  `docs/design/declarative-discovery.md` exists, plus a folder-scan
  callsite inventory (`REFS.md`) and a per-playbook migration catalog
  (`playbooks-catalog.json`). All three predecessors confirmed merged.
- **`02-children-and-registry-schema`** — `TASK.md` frontmatter accepts
  `children:` and `from_seed:` fields; a path registry shape is defined.
  Schema-only — no loader change yet.
- **`03-declarative-loader`** — new loader walks declarations only. Lives
  behind a flag (`CONVERGE_DECLARATIVE_DISCOVERY=1`); folder-scan loader
  unchanged. Both paths green for the same fixture.
- **`04-runtime-and-manifest`** — runtime and manifest writer use the
  declarative loader when the flag is set. Spawning-seed children get
  registered with parent edges decoupled from filesystem path. The
  three-state machinery (`frontier`/`expected`/`concrete`) and selectors
  read the manifest unchanged.
- **`05-migrate-playbooks`** — every live playbook gets `children:`
  declarations added to every parent TASK.md. Per-playbook fan-out uses
  a spawning seed (dbt-paradigm). Each migrated playbook is verified
  under both loaders; results must match.
- **`06-strip-folder-scan-and-docs`** — delete the folder-scan loader,
  delete the flag, write the user-facing guide, tombstone the old code.

## Children

| id | kind | goal | gating output |
|---|---|---|---|
| `01-survey-and-discovery-spec` | container | Design doc + REFS + catalog + predecessor verification | Three artifacts exist; `pnpm -r test` baseline green |
| `02-children-and-registry-schema` | container | TASK.md accepts `children:` and `from_seed:`; path registry shape defined; folder-scan unchanged | Parser unit tests green; fixture playbook with `children:` declarations parses correctly |
| `03-declarative-loader` | container | New loader walks declarations only, behind a flag; both paths green for the same fixture | `CONVERGE_DECLARATIVE_DISCOVERY=1 pnpm test` and `pnpm test` both green; cross-loader parity test confirms identical DAG |
| `04-runtime-and-manifest` | container | Runtime + manifest use declarative when flag set; spawning-seed children get parent edges decoupled from path | Spawning-seed integration test green under flag; manifest shows correct edges regardless of child path |
| `05-migrate-playbooks` | container (seed-spawned per playbook) | Every live playbook has `children:` on every parent | Per-playbook parity test green: same DAG under both loaders |
| `06-strip-folder-scan-and-docs` | container | Folder-scan path gone; flag gone; docs written | Tombstone test green; `grep -rln 'walkTasksDirectory'` returns zero matches; guide exists |

## Sequencing rationale

1. **Spec before code.** REFS.md catalogs every callsite of folder-scan
   logic. Without it, phase 06's deletion is hand-wavy.
2. **Schema before loader.** The new fields must parse before the loader
   can read them.
3. **Loader before runtime.** The runtime consumes the loader's output;
   wiring the runtime to a missing loader is a recipe for green-on-
   accident tests.
4. **Loader behind a flag.** Both paths exist during 03–05 so migration
   can verify parity per playbook. The flag is a temporary scaffold,
   not a permanent feature.
5. **Migrate before strip.** Phase 05 ensures every live playbook works
   under the flag; phase 06 then strips folder-scan with confidence.
6. **Strict numeric depends_on this time.** Unlike dbt-paradigm, we
   don't need to dance the order — the migration in 05 consumes the
   flag-gated runtime from 04, not the legacy loader.

## Key design decisions

These are locked in by user direction; phase 01's design doc records
them and adds the supporting detail.

### Children declaration syntax (hybrid)

```yaml
# Bare ID — path defaults to <parent-dir>/<id>/TASK.md
children:
  - 001-foo
  - 002-bar

# Explicit path override — child can live anywhere
children:
  - id: 003-shared
    path: tasks/_shared/some-task/TASK.md

# Dynamic — children come from a spawning seed (dbt-paradigm)
from_seed: per-token
```

A parent may have either `children:`, `from_seed:`, or both (static +
dynamic siblings). Two parents may reference the same child id (DAG, not
tree).

### Path registry

Built implicitly by the loader as it walks declarations. Each TASK.md
discovered gets an entry `{ id → path }` in the registry. Two TASK.md
files with the same id at different paths is an error. The registry is
exposed on the loader's return value alongside the existing tasks tree.

### Spawning-seed children, location-independent

A spawning seed emits `{ tasks: [{ id, vars, path? }] }`. If `path` is
present, the runtime materializes the child there; otherwise the
default is `<parent-dir>/_spawned/<id>/TASK.md`. Either way, the
manifest records the parent-child edge — the path is metadata, not
structure. `child-synthesizer.ts` (from dbt-paradigm) is the integration
point.

### Hard cutover, no fallback

Phase 06 deletes the folder-scan loader entirely. The flag from phase 03
is removed. Any playbook not migrated by phase 05 will fail to load
post-cutover; that's acceptable because phase 05's catalog is exhaustive
and its parity tests gate the cutover.

## TDD discipline

Strict red-green-refactor for additions (mirrors cli-redesign and
dbt-paradigm). Inverted red-green for the folder-scan deletion (mirrors
remove-goals and dbt-paradigm phase 04).

A new flavor of test is heavily used in phases 03–05: **cross-loader
parity**. Given a fixture playbook, load it with folder-scan and with
declarative; assert the two DAGs are identical (same nodes, same edges,
same ids). This is the gate on the cutover.

Mechanically gated:
- `pnpm --filter @converge/core --filter @converge/cli typecheck` exits 0.
- `pnpm --filter @converge/core --filter @converge/cli test` exits 0.

## Coordination with predecessors

- **`cli-redesign`** — manifest format, `--select` grammar, `target/`
  directory all exist. Phase 04 here extends manifest writing; do not
  reinvent the format.
- **`remove-goals`** — legacy goal concept gone. Phase 06 doesn't touch
  goal code (already deleted).
- **`dbt-paradigm`** — seeds and tests exist; `child-synthesizer.ts`
  exists; WBS API is gone. Phase 02's `from_seed:` field is the
  declarative entry point for spawning seeds. Phase 04's spawning-seed
  child registration extends what dbt-paradigm phase 03 built.

Phase 01's first task verifies all three predecessors via the
playbook-level `predecessor-*-merged` checks. Failure aborts the phase.

## Critical files

Created:
- `docs/design/declarative-discovery.md` (phase 01)
- `docs/guides/declarative-tasks.md` (phase 06)
- `.converge/playbooks/declarative-discovery/REFS.md` (phase 01)
- `.converge/playbooks/declarative-discovery/playbooks-catalog.json` (phase 01)
- `packages/core/src/config/declarative-loader.ts` (phase 03)
- `packages/core/src/config/path-registry.ts` (phase 03)
- `packages/core/tests/loader-parity.test.ts` (phase 03 — cross-loader parity)
- `packages/core/tests/no-folder-scan.test.ts` (phase 06, tombstone)

Modified:
- `packages/core/src/config/task-md-definition.ts` — accept `children:`
  and `from_seed:` fields (phase 02). Strip in no phase — these are
  permanent.
- `packages/core/src/config/loader.ts` — phase 03 routes through either
  declarative-loader or the existing folder-scan based on the flag.
  Phase 06 deletes the folder-scan branch and inlines the declarative
  call.
- `packages/core/src/manifest/*` — child edges are recorded from
  declarations, not derived from path nesting (phase 04). Reuse the
  manifest writer.
- `packages/core/src/runtime/seed-spawner.ts` (from dbt-paradigm) —
  registers spawned children in the path registry; manifest edges from
  parent (phase 04).
- Every live playbook's parent `TASK.md` files — `children:` added in
  phase 05.

Deleted (phase 06):
- The folder-scan branch in `loader.ts` and any helper functions it
  uses (`walkTasksDirectory`, `scanTaskDirectories`, etc. — exact list
  in phase 01's REFS).
- The `CONVERGE_DECLARATIVE_DISCOVERY` flag and any conditionals reading
  it.
- Any tests asserting folder-scan behavior.

## Reuse callouts (do not reinvent)

- **Manifest writer**: `cli-redesign` phase 01 lands it. Phase 04 here
  extends it; do not introduce a second format.
- **Selectors**: same — `--select` grammar already addresses the DAG by
  id. No new selectors needed.
- **Child synthesizer**: `dbt-paradigm` phase 03 lands
  `packages/core/src/runtime/child-synthesizer.ts`. Phase 04 here uses
  it as the integration point for spawning-seed children; do not write
  parallel synthesis logic.
- **TDD harness**: extend the `minimal-playbook` fixture from prior
  playbooks; do not create a new one. Add a sub-fixture that exercises
  `children:` and `from_seed:`.

## Open questions (phase 01 resolves)

1. **Path registry persistence.** Does the registry get serialized into
   the manifest (one place to look up id → path) or stay in-memory
   only? Default proposed: serialized in manifest under
   `metadata.registry`. Useful for tooling.
2. **Cycle detection.** With `children:` referencing arbitrary ids, a
   user can author a cycle. Phase 03 adds a cycle check in the loader.
   Default: hard error on cycle, with the cycle path in the message.
3. **Two parents claim the same child.** DAG model allows it. The
   manifest treats it as two incoming edges. Default: allowed, with
   a `multi-parent:` selector for tooling. Phase 04 confirms.
4. **Implicit defaults for path.** When a child entry is a bare id, the
   default path is `<parent-dir>/<id>/TASK.md`. If the file isn't there,
   the loader errors. No fallback to `find`.
5. **Migration script.** Phase 05's per-playbook migration is mostly
   mechanical (read folder structure → emit children: lists). Should
   it be a one-shot script or a spawning seed? Default: spawning seed,
   so we dogfood dbt-paradigm's mechanism on a real workload.
6. **Backward compat for examples.** Some `examples/` are archived
   (frozen reference). They keep folder-scan behavior? No — phase 06
   deletes folder-scan entirely. Archived examples either get migrated
   read-only or get a README note explaining they no longer load.

## Pointers

- Predecessor playbooks: `.converge/journal/cli-redesign/`,
  `.converge/playbooks/remove-goals/`, `.converge/playbooks/dbt-paradigm/`.
- Spec doc to be created in phase 01:
  `docs/design/declarative-discovery.md`.
- Current loader: `packages/core/src/config/loader.ts` (folder-scan
  logic lives here; phase 03 routes through it; phase 06 deletes the
  folder-scan branch).
- dbt-paradigm child synthesizer (integration point):
  `packages/core/src/runtime/child-synthesizer.ts`.
- Test framework: vitest, real-tmpdir fixture pattern; integration
  tests use `execFileSync` against the built CLI dist.
