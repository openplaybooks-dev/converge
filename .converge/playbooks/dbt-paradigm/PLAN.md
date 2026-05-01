# PLAN — dbt-paradigm (root)

## Goal restatement

Complete the framework's shift to the dbt mental model. Runs *after* both
`cli-redesign` (v2 CLI, `--select` DSL, three-state manifest) and
`remove-goals` (legacy goal concept removed). My job at the root: write the
six phase contracts and let the per-layer planner expand each one.
Discipline: strict red-green-refactor at every leaf for additions; inverted
red-green for deletions.

## Decision

CONTAINER. Six children, ordered by hard data dependencies. No fan-out at
the root. WBS-style fan-out lives *inside* phases 04 (per-legacy-module
deletion) and 05 (per-playbook migration).

## Pattern (from converge-planning §3)

**Lifecycle Pipeline.** The artifact (the dbt-shape framework) evolves
through ordered stages — schema, runtime, CLI surface, legacy strip,
per-playbook migration, docs. Each phase produces a *qualitatively
different* result. Not Process Pipeline (the stages don't transform a
single shared population), not Domain Layering (no list of equal entities
at the top — though phase 05 uses WBS internally to replicate per-playbook
migration).

## Why these phases (not others)

The phases are scope-decomposed by *what exists when each is done*, not by
process. Each phase's name is a noun:

- **`01-survey-and-paradigm-spec`** — `docs/design/dbt-paradigm.md` exists
  defining the seed/test library shape, the two seed roles, the new
  test-reference check variant, and a complete legacy-removal inventory
  (`REFS.md`). Predecessor playbooks are confirmed-merged on `main`.
- **`02-seeds-and-tests-libraries`** — `seeds/` and `tests/` schema modules
  land. Loader discovers both libraries. The task `checks:` field becomes
  a discriminated union that accepts a new test-reference variant; the
  loader expands every test reference into an inline check at parse time.
  No DAG impact yet, no runtime resolution yet, WBS still in place.
- **`03-runtime-and-spawning`** — runtime resolution for seeds: context
  seeds merge into inputs at task setup; spawning seeds materialize
  dynamic children. The per-entity child synthesis is extracted from
  `wbs-executor.ts` into a shared module so phase 04 can delete WBS
  without losing it. Tests need no runtime hook — they were resolved to
  inline checks at config-load. Selection DSL gains `seed:<name>` and
  `test:<name>`. Manifest gains a `libraries:` section. WBS still works
  side-by-side; both paths green.
- **`05-migrate-playbooks`** — every playbook under `.converge/playbooks/`
  and `examples/` migrated. WBS parents become `seeds: [<name>]` with a
  generated seed file. Repeated `checks:` extracted into `tests/`.
  Externally-sourced `inputs:` extracted into context seeds where
  applicable. **This is the last phase that uses the legacy WBS executor**
  — its own per-playbook fan-out runs on legacy WBS, by design.
- **`04-strip-legacy`** — two-pass deletion. Pass A: WBS API
  (`wbs-executor.ts`, `wbs-target-utils.ts`, every remaining `wbs/`
  directory, `wbs:` frontmatter field). Pass B: dod/legacy concepts
  (`dod-runner`, `gap-ledger`, `backlog-bridge`, `weights`,
  `fabrication-scanner`, `autonomous-run`, `commands-backlog`, dod-tied
  `synthesis/` modules per phase 01's `REFS.md`).
- **`06-docs-and-tombstones`** — docs reflect the new selectors and the
  three-roots-one-DAG model. Migration table in cli-redesign design doc
  gets a follow-up note. Final tombstone tests consolidated.

## Children

| id | kind | goal | gating output |
|---|---|---|---|
| `01-survey-and-paradigm-spec` | container | Design doc + `REFS.md` + predecessor verification | `docs/design/dbt-paradigm.md` exists; `pnpm -r test` baseline green |
| `02-seeds-and-tests-libraries` | container | Schema for seeds and tests; loader discovers both; `checks:` accepts test references; loader expands to inline | Parser unit tests green; loader test proves discovery + expansion + unresolved-reference errors |
| `03-runtime-and-spawning` | container (WBS per concern) | Context seeds merge inputs; spawning seeds materialize dynamic children; per-entity synthesis extracted from `wbs-executor.ts`; selectors and manifest extended | Fixture playbook round-trips with both seed paths; WBS path still green |
| `05-migrate-playbooks` | container (WBS per playbook) | Every live playbook migrated to seeds + tests | Per-playbook integration test green; `grep -rlE '^wbs:'` over playbooks returns nothing |
| `04-strip-legacy` | container (WBS per legacy module) | Pass A: WBS API gone. Pass B: dod/legacy modules gone | `tests/no-legacy-api.test.ts` green; `pnpm -r typecheck && pnpm -r test` green |
| `06-docs-and-tombstones` | container | Docs updated; tombstones consolidated | `grep -rn '\b(dod\|gap-ledger\|fabrication\|backlog-bridge\|epic\|GoalDef\|wbs-executor)\b' packages/ docs/` returns zero matches outside historical mentions |

## Sequencing rationale

The trickiest constraint is the WBS deletion. WBS executor is used by
*current* playbooks, and `05-migrate-playbooks` itself uses WBS to fan out
per-playbook migration. So execution order is **`01 → 02 → 03 → 05 → 04 →
06`** (not strict numeric).

1. **Phase 01** — design doc + `REFS.md` + predecessor verification.
2. **Phase 02** — schema for seeds and tests; libraries discoverable but
   not used at runtime.
3. **Phase 03** — runtime supports both old WBS and new seeds side-by-side.
   New code works; old code untouched.
4. **Phase 05** — per-playbook migration uses legacy WBS for its own fan-out
   *one last time* — by design, since the WBS executor still exists. Every
   user playbook ends up on seeds.
5. **Phase 04** — now that no user playbook uses WBS, delete the WBS API
   (pass A) plus all dod/legacy modules (pass B).
6. **Phase 06** — docs and final tombstone consolidation.

The phase IDs use the lifecycle order users expect to read in `tasks/`; the
`depends_on` block in `playbook.yml` encodes the necessary execution order.

Other rationales:
- **Spec before code.** Without phase 01's `REFS.md`, phase 04's per-leaf
  gate becomes meaningless (lesson from `remove-goals` §02).
- **Schema before runtime.** Library parsers must exist before the runtime
  can pull from them (lesson from `cli-redesign` phase 01).
- **Runtime before legacy strip.** New seed path must work end-to-end
  before legacy is stripped.
- **Strip before docs.** Docs reference final command outputs and fixture
  playbooks.

## TDD discipline (project-wide)

**Strict red-green-refactor at every leaf for additions.** Each leaf task
body says, in this order:

1. Write a failing test that captures the contract (the leaf's `outputs:`
   and `checks:`).
2. Run it — must be RED.
3. Implement until GREEN.
4. Refactor while GREEN.

**Inverted red-green for deletions** (mirrors `remove-goals`):
1. Write a negative-existence test (`expect(fs.existsSync(path)).toBe(false)`
   for deletions; `expect(parseTaskMd(...)).toThrow(/unknown field/)` for
   schema strips).
2. Delete until passing.
3. Leave the test as a tombstone.

Mechanically gated:
- `pnpm --filter @converge/core --filter @converge/cli typecheck` exits 0.
- `pnpm --filter @converge/core --filter @converge/cli test` exits 0.

## Coordination with predecessors

- **Hard prerequisite: `cli-redesign` is merged.** Phase 03 here adds
  `seed:` / `test:` method selectors on top of the v2 select grammar, and
  adds the `libraries:` section to the manifest. The
  `frontier`/`expected`/`concrete` machinery is what makes spawning seeds
  work cleanly. If `cli-redesign` ships partially, phase 03 stalls.
- **Hard prerequisite: `remove-goals` is merged.** Phase 04's pass-B
  catalog assumes the goal concept is gone; otherwise it collides.
- Phase 01's first task **verifies** both predecessors are merged on `main`
  via the playbook-level checks `predecessor-cli-redesign-merged` and
  `predecessor-remove-goals-merged`. If not, the task fails red and the
  user sequences predecessors first.

## Critical files (paths to be modified or created)

Created:
- `docs/design/dbt-paradigm.md` (phase 01)
- `docs/guides/seeds-tasks-tests.md` (phase 06)
- `packages/core/src/config/seed-md-definition.ts` (phase 02)
- `packages/core/src/config/test-md-definition.ts` (phase 02)
- `packages/core/src/config/test-expander.ts` (phase 02 — expands
  `test:<name>` check references into inline checks at config-load)
- `packages/core/src/runtime/seed-resolver.ts` (phase 03 — context-seed
  merge into inputs)
- `packages/core/src/runtime/seed-spawner.ts` (phase 03 — spawning-seed →
  dynamic-children materialization; extracts the shared synthesis logic
  out of `wbs-executor.ts` so phase 04 can delete the rest)
- `packages/core/tests/no-legacy-api.test.ts` (phase 04, tombstone)

Modified:
- `packages/core/src/config/loader.ts` — discover `seeds/` and `tests/`
  siblings of `tasks/` and build registries (phase 02). Reuse the existing
  playbook-walk; do not write a parallel walker.
- `packages/core/src/config/task-md-definition.ts` — accept `seeds:` array
  in frontmatter; widen `checks:` to a discriminated union accepting inline
  checks (existing) and test references (new); record original
  test-reference names on the task for the `test:` selector (phase 02).
  Strip `wbs:` field in phase 04 pass A.
- `packages/core/src/manifest/*` — add `libraries:` section listing
  discovered seeds/tests (phase 03); a spawning-seed parent's
  frontier/expected/concrete state is keyed off the seed (phase 03).
  Reuse the manifest writer landed by `cli-redesign` phase 01.
- `packages/core/src/select/*` — add `seed:<name>` and `test:<name>`
  methods (phase 03). Reuse the selector AST landed by `cli-redesign`
  phase 01.
- `packages/core/src/runtime/runtime.ts` — at task setup, dispatch through
  `seed-resolver` and `seed-spawner`. Tests need no runtime hook — they're
  inline checks by this point (phase 03).

Deleted (catalog produced by phase 01, finalised in phase 04):
- **WBS API (pass A):** `packages/core/src/executor/wbs-executor.ts`,
  `wbs-target-utils.ts`, all `wbs/` directories in user playbooks
  (replaced by seeds in phase 05), the `wbs:` frontmatter field in
  `task-md-definition.ts`, and the `wbs:` selector unless it remaps
  cleanly to `seed:`.
- **Legacy concepts (pass B):**
  `packages/core/src/converge/{dod-runner,gap-ledger,backlog-bridge,weights}.ts`;
  `packages/cli/src/{fabrication-scanner,commands-backlog,autonomous-run}.ts`
  (functions of `autonomous-run` absorbed by `commands-run.ts`); any
  `synthesis/` modules confirmed dod-tied in phase 01.

The exact deletion set is a phase-01 deliverable, not a guess.

## Reuse callouts (do not reinvent)

- **Manifest, hash, select**: `cli-redesign` phase 01 lands
  `packages/core/src/{select,manifest,hash}/`. Phase 02–03 here extend
  them; do not introduce a second manifest format or a second select
  grammar. The frontier/expected/concrete machinery is the integration
  point for spawning seeds.
- **Loader and playbook walking**:
  `packages/core/src/config/loader.ts` already walks `tasks/`. Phase 02
  extends it to also walk `seeds/` and `tests/`; do not write a parallel
  walker.
- **Per-entity child synthesis**: `wbs-executor.ts` contains the logic
  that materializes a child TASK.md from a parent + a vars binding.
  Phase 03 extracts this into `seed-spawner.ts` so phase 04 can delete
  `wbs-executor.ts` without losing it.
- **TDD harness**: `cli-redesign` phase 06 commits
  `packages/cli/tests/fixtures/minimal-playbook/`. Phase 02 here extends
  it with `seeds/` and `tests/` directories rather than creating a
  second fixture.
- **Inverted-red-green pattern**: `remove-goals` PLAN §"TDD discipline"
  documents the three flavors of failing test. Phase 04 reuses verbatim.

## Open questions

These are decisions the design doc (phase 01's deliverable) needs to lock
in. Defaults are listed but not yet confirmed:

1. **`tests/` and `seeds/` placement scope.** Playbook-scoped
   (`<playbook>/tests/`, `<playbook>/seeds/`) or project-scoped
   (`.converge/{seeds,tests}/` shared across playbooks)? Default:
   playbook-scoped first; a `--shared` mechanism deferred.
2. **Seed output discriminator (context vs spawning).** (a) explicit
   `kind: context | spawning` field; (b) shape inference at runtime;
   (c) a single role with a structured output where `tasks: []` means "no
   spawn." Default: (a) explicit `kind:`.
3. **Seed result caching across tasks.** When two tasks reference the same
   context seed, do we re-run it per task or memoize? Default: memoize
   per session by `(seed-name, args, input-hash)`.
4. **Seed argument values reaching the body.** Default: passed as
   `args.<key>` in the templating context, parallel to task `vars:`.
5. **Spawned-task identity stability.** Spawning-seed output entries must
   include a stable `id` field; the runtime errors out if IDs change
   between runs without a `--full-refresh`.
6. **Legacy-strip edge cases.** `synthesis/` and parts of `validation/`
   may be load-bearing for non-dod paths. Phase 01's `REFS.md` is the
   gate — do not strip what hasn't been confirmed dod-tied.
7. **Existing `examples/` playbooks.** Which examples are "live" (we
   maintain them) vs "archived" (frozen reference)? Phase 05's migration
   WBS only touches live ones; archived ones get a README note. Phase 01
   produces the partition.
8. **Self-hosting risk in phase 05.** Phase 05 itself uses the legacy
   WBS executor (its own fan-out) to migrate every other playbook *off*
   WBS. Phase 01 must verify the WBS executor stays functional on a
   `seeds:`-using parent (it should — the executor doesn't care about
   other frontmatter fields). If it doesn't, phase 05 falls back to a
   hand-written task list.

## Pointers

- Plan of record: `~/.claude/plans/check-users-minh-documents-converge-docs-starry-gizmo.md`.
- Predecessor playbooks: `.converge/journal/cli-redesign/`,
  `.converge/playbooks/remove-goals/`.
- Spec doc to be created in phase 01: `docs/design/dbt-paradigm.md`.
- Current WBS executor (extracted in phase 03, deleted in phase 04):
  `packages/core/src/executor/wbs-executor.ts`,
  `packages/core/src/executor/wbs-target-utils.ts`.
- Current task-md schema:
  `packages/core/src/config/task-md-definition.ts` (`checks:` widening
  in phase 02).
- Current loader: `packages/core/src/config/loader.ts` (extended in
  phase 02 to discover `seeds/` and `tests/`).
- Test framework: vitest, real-tmpdir fixture pattern; integration tests
  use `execFileSync` against the built CLI dist.
