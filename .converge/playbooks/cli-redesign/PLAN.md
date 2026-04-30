# PLAN.md — cli-redesign (root)

## Goal restatement

Implement the v2 CLI defined in `docs/design/cli-redesign.md`. The proposal is
already approved (clean-break v2 surface). My job at the root: write the six
phase contracts and let the per-layer planner expand each one into its
children. Discipline: strict red-green-refactor at every leaf.

## Decision

CONTAINER. Six children, ordered by hard data dependencies (each phase's
output is a precondition for the next phase's first leaf). No fan-out at the
root.

## Pattern (§3)

**Lifecycle Pipeline.** The artifact (the v2 CLI) evolves through ordered
stages. Each phase produces a *qualitatively different* result — a parser,
then a manifest reader/writer, then verbs that consume it, then staleness
overlays, etc. Not Process Pipeline (the stages don't transform a single
shared population), not Domain Layering (no list of equal entities at the
top — although phase 03 uses WBS internally to replicate red-green-refactor
across verbs).

## Why these phases (not others)

The phases are scope-decomposed by *what exists when each is done*, not by
process. Each phase's name is a noun:

- `01-foundations` — three pure libraries (`select`, `manifest`, `hash`)
  exist, fully unit-tested, with no CLI wiring. Anything that touches the
  shape of the manifest or the grammar of `--select` lands here so later
  phases inherit a frozen contract.
- `02-compile-and-list` — the read-only verbs (`compile`, `list`,
  `compile --seed`) exist. First user-visible CLI surface; deliberately
  read-only so it can land before any execution path is touched.
- `03-execution-verbs` — `run`, `build`, `test`, `retry`, `clean` exist
  and respect the static portion of the DAG. WBS phase: one instance per
  verb, red-green-refactor inside each. `clean` lands here (rather than
  with `compile`/`list`) because it mutates journal state. Static-DAG
  only — staleness is §04.
- `04-staleness` — the `state:modified.{body,frontmatter,checks,inputs,
  upstream,playbook,drifted}` ladder works against `--state PATH`, plus
  `run_results.json` writes output hashes, plus opt-in `debug --revalidate`
  exists. Today's automatic re-validation goes away in this phase.
- `05-incremental-and-freshness` — `materialization: incremental` with
  `{{ is_incremental }}` / `{{ this_state }}` template vars works,
  `--full-refresh` works, `converge source freshness` reports
  `pass/warn/error` per source.
- `06-migration` — every removed v1 command prints a one-line v2 hint and
  exits non-zero (already partly true today; this phase completes the
  table in §10 of the spec doc). Renamed verbs land here: `deps`
  (skills→deps) and `init --from-prompt` (absorbs today's `plan`). Docs
  site renders the new pages.

## Children

| id | kind | goal | gating output |
|---|---|---|---|
| `01-foundations` | container (executable sub-tree) | Pure libraries land in `packages/core/src/{select,manifest,hash}/` with red-green-refactor unit tests. No CLI wiring. | New folders + `pnpm -r test` green for the new code. |
| `02-compile-and-list` | container | `converge compile` writes `target/manifest.json`; `converge list --select <expr>` resolves; `compile --seed` materializes WBS children. | Three CLI subprocess integration tests pass. |
| `03-execution-verbs` | WBS (per-verb red-green-refactor) | `run`, `build`, `test`, `retry`, `clean` accept `--select`/`--exclude` and operate against the static portion of the DAG. | Per-verb integration test suite green. |
| `04-staleness` | container | The seven `state:modified.*` sub-methods work. `run_results.json` carries output hashes. `debug --revalidate` exists; auto-revalidation on `--resume` removed. | `converge list --select 'state:modified+' --state /tmp/snap` regression test green. |
| `05-incremental-and-freshness` | container | Incremental tasks honor `is_incremental`. `--full-refresh` forces fresh execution. `converge source freshness` reports per source. | Incremental reuse test (run twice, second is a no-op for unchanged inputs) + freshness threshold test green. |
| `06-migration` | container | All v1 commands print v2-redirect messages with non-zero exit. Migration table from §10 implemented. `deps` and `init --from-prompt` land. Docs site renders. | Per-row regression test in `packages/cli/tests/integration/migration-redirects.test.ts` green. |

## TDD discipline (project-wide)

**Strict red-green-refactor at every leaf.** Each leaf task body says, in
this order:

1. Write a failing test that captures the contract (the leaf's `outputs:`
   and `checks:`).
2. Run it — must be RED. If it isn't, the test is wrong; rewrite.
3. Implement until GREEN.
4. Refactor while GREEN.

Mechanically enforced via two checks on every leaf:
- `vitest run <test-glob>` exits 0 (green).
- `git log --diff-filter=A --name-only HEAD~..HEAD -- '*.test.ts'` for the
  task's window shows the test file was added in or before the
  implementation commit (cheap proxy — caught by `converge debug`).

The per-layer planner (§6 of the skill) is responsible for elaborating this
into concrete `01-write-failing-test → 02-implement → 03-refactor` triples
where appropriate, but for some leaves (a renamed function, a docs update)
the test file may already exist and only one of the three is needed. The
planner decides per leaf — it does not blindly fan out 3× for every change.

## Deferred to follow-up playbooks

The spec doc names two verbs we don't ship in this playbook:

- **`converge seed`** (spec §3) — mirrors `dbt seed` for materializing
  fixture inputs declared in `playbook.yml`. No current Converge playbook
  declares such inputs, and the runtime has no concept yet. Defer until a
  concrete use case appears.
- **`converge docs generate` / `docs serve`** (spec §3) — static HTML
  rendering of the playbook DAG, task READMEs, and lineage. Substantial
  new feature (templating, asset bundling, dev server). Out of scope for
  the v2 CLI playbook; deserves its own design pass.

These are documented as out-of-scope in `06-migration/TASK.md`. A
follow-up playbook (e.g. `cli-redesign-followups`) can pick them up.

## Open questions (to surface to the user before implementation begins)

1. **Backwards-compat shim release.** The spec says removed v1 commands print
   a redirect for one release, then are removed. What's a "release" here?
   Tag? PR-merge? This affects whether 06-migration ships redirects forever
   or has a follow-up cleanup playbook scheduled. The design doc punts.
2. **Test-fixture playbook.** CLI integration tests need a small playbook on
   disk to run against. The planning skill's anchor `examples/baby-app/` is
   too heavy. Do we add a `packages/cli/tests/fixtures/minimal-playbook/`
   under source control, or generate via `converge init` in beforeAll?
   I default to: under source control, hand-written minimal. Phase 02 will
   commit it; later phases extend it.
3. **Hashing cost.** The proposal flags `inputs_hash` over large binaries as
   an open question (§13.3). Phase 01 must pick a default — either skip
   files over N MB or hash everything. Default proposed: hash everything,
   add an opt-out flag in a follow-up.
4. **CI.** The repo has no GitHub Actions today. Adding CI is out of scope
   for this playbook (nothing in the spec doc says to). I will not add CI;
   the user can add a separate playbook for that.

## Pointers

- Spec doc: `docs/design/cli-redesign.md` (sections referenced as §N
  throughout).
- Current CLI entry: `packages/cli/src/main.ts`.
- Test framework: vitest, real-tmpdir fixture pattern; CLI tests use
  `execFileSync("node", [CLI, ...])` against built dist (see
  `packages/core/tests/integration/no-eager-journal-writes.test.ts` for the
  pattern to copy).
- Current substring filter: `packages/core/src/task/tree/task-tree.ts`
  (`findFirstRunnableMatch`, ~line 381). This is what `--select` replaces.
- Hash module: `packages/core/src/playbook/hash.ts`. Phase 01 extends it.
- WBS execution path: `packages/core/src/executor/wbs-executor.ts`. Phase 02
  invokes it standalone for `compile --seed`.
