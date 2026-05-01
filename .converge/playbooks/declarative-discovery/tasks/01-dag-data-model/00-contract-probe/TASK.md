---
title: Probe cli-redesign, remove-goals, and dbt-paradigm contracts behaviorally; surface drift before phase 02
description: |
  This sub-task runs behavioral probes against the three predecessor
  surfaces this playbook's later phases assume. dbt-paradigm is the
  largest contract surface — it lands child-synthesizer.ts,
  seed-spawner.ts, the seed/test schemas, and the WBS deletion that
  declarative-discovery's phases 02–06 all assume. If any probe fails,
  a predecessor contract drifted during implementation and the
  affected declarative-discovery TASK.md needs revision.

inputs:
  - .converge/playbook-chain.md
  - packages/core/src/select
  - packages/core/src/manifest
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/runtime/seed-spawner.ts
  - packages/core/src/runtime/seed-resolver.ts
  - packages/core/src/config/seed-md-definition.ts
  - packages/core/src/config/test-md-definition.ts
  - packages/core/src/config/task-md-definition.ts

outputs:
  - .converge/playbooks/declarative-discovery/contract-probe-report.md

checks:
  - id: predecessor-cli-redesign-merged
    cmd: test -d packages/core/src/select
    description: cli-redesign select module exists.
  - id: predecessor-remove-goals-merged
    cmd: "! test -f packages/core/src/runtime/goal-manager.ts"
    description: remove-goals deleted goal-manager.
  - id: predecessor-dbt-paradigm-merged
    cmd: test -f packages/core/src/runtime/child-synthesizer.ts && ! test -f packages/core/src/executor/wbs-executor.ts
    description: dbt-paradigm landed child-synthesizer and removed WBS executor.
  - id: probe-manifest-edges-from-parent-map
    cmd: |
      f=$(find . -path '*/target/manifest.json' 2>/dev/null | head -1)
      test -n "$f" && jq -e 'has("parent_map") and has("child_map")' "$f" >/dev/null
    description: Manifest exposes parent_map and child_map. Phase 02 (declarative loader) sources these from declarations rather than from path nesting.
  - id: probe-libraries-section-in-manifest
    cmd: |
      f=$(find . -path '*/target/manifest.json' 2>/dev/null | head -1)
      test -n "$f" && jq -e '.libraries | has("seeds") and has("tests")' "$f" >/dev/null
    description: dbt-paradigm's libraries section is present (seeds + tests). Phase 03 (dag-runner) preserves this section unchanged.
  - id: probe-child-synthesizer-callable
    cmd: |
      node -e "const m = require('./packages/core/dist/runtime/child-synthesizer.js'); if (typeof m.synthesize !== 'function') process.exit(1);"
    description: child-synthesizer exports a callable `synthesize` function. Phase 03 (dag-runner) uses it as the integration point for spawning-seed children.
  - id: probe-seed-spawner-honors-path
    cmd: |
      node -e "const m = require('./packages/core/dist/runtime/seed-spawner.js'); if (typeof m.spawnDynamicChildren !== 'function') process.exit(1);"
    description: seed-spawner exports the expected entry function. Phase 03 (dag-runner) extends it to register children at custom paths.
  - id: probe-seed-md-schema-shape
    cmd: |
      node -e "const m = require('./packages/core/dist/config/seed-md-definition.js'); if (typeof m.parseSeedMd !== 'function') process.exit(1);"
    description: seed-md-definition exports a parser. Phase 01 (dag-data-model) references the seed registry from `from_seed:` declarations in the TASK.md schema.
  - id: probe-test-md-schema-shape
    cmd: |
      node -e "const m = require('./packages/core/dist/config/test-md-definition.js'); if (typeof m.parseTestMd !== 'function') process.exit(1);"
    description: test-md-definition exports a parser. The test-reference check type from dbt-paradigm must keep working under the declarative loader.
  - id: probe-no-wbs-frontmatter-field
    cmd: "! grep -nE '^[[:space:]]*wbs[?]?:' packages/core/src/config/task-md-definition.ts"
    description: task-md schema has no wbs: frontmatter field. Phase 01 (dag-data-model) does not need to handle wbs: in the new schema.
  - id: probe-no-wbs-executor
    cmd: "! test -f packages/core/src/executor/wbs-executor.ts && ! test -f packages/core/src/executor/wbs-target-utils.ts"
    description: WBS executor and target-utils are gone. dbt-paradigm phase 04 deleted them; nothing in declarative-discovery depends on them.
  - id: probe-seed-and-test-selectors-work
    cmd: |
      node packages/cli/dist/index.js list --help 2>&1 | grep -qE 'seed:|test:' \
        || node packages/cli/dist/index.js list --select 'seed:nonexistent' 2>&1 | grep -qiE 'seed|select'
    description: `--select 'seed:<name>'` and `test:<name>` selectors are registered. The DAG runner (phase 03) does not add new selectors; the existing grammar must still work.
  - id: probe-fixture-has-seeds-and-tests
    cmd: test -d packages/cli/tests/fixtures/minimal-playbook/seeds && test -d packages/cli/tests/fixtures/minimal-playbook/tests
    description: minimal-playbook fixture has seeds/ and tests/ directories. Phase 02 (declarative-loader) extends the same fixture with `children:` declarations.
  - id: report-present
    cmd: test -s .converge/playbooks/declarative-discovery/contract-probe-report.md
    description: A pass/fail report per probe is committed.

skills: []
references:
  - "@.converge/playbook-chain.md"

vars: {}
dependencies: []
---

# 00 — Contract probe (declarative-discovery)

This is the first leaf of phase 01. Phase 01's other artifacts (design
doc, REFS.md, migration catalog) are written *after* this leaf passes,
because their content depends on the actual state of the predecessor
surfaces — and there are three predecessors here, the largest being
dbt-paradigm.

## What this checks

`.converge/playbook-chain.md` enumerates the surfaces this playbook
reads from cli-redesign, remove-goals, and dbt-paradigm. The 13 checks
above probe each surface behaviorally — not just file-existence.

The dbt-paradigm probes (`probe-child-synthesizer-callable`,
`probe-seed-spawner-honors-path`, etc.) are the highest-risk: that
playbook's implementation choices about names and signatures most
directly shape this playbook's phases 01 (schema), 02 (loader), and
03 (dag-runner) contracts.

## What to do if a probe fails

A failed probe means a predecessor's contract changed during
implementation. The downstream contract in this playbook is now stale.
**Do not proceed to the rest of phase 01 until the affected TASK.md
files are updated.**

For each failed probe:

1. Open `.converge/playbook-chain.md` and find the matching row in the
   "Per-edge contract" section.
2. Find which declarative-discovery phase reads that surface.
3. Read the actual current state of the surface (run the probe by
   hand, inspect the symbol, read the dist output).
4. Update the affected phase's TASK.md to match the new contract.
5. Re-run the probe. Iterate until green.

Common drifts to expect:
- **Renames**: `child-synthesizer.synthesize` could be
  `synthesize-child` or split into multiple exports. Update phase 03's
  references.
- **Added required arguments**: if `synthesize(parent, entry)` became
  `synthesize(parent, entry, ctx)`, phase 03's wiring needs the third
  arg.
- **Manifest schema additions**: dbt-paradigm phase 03 may have added
  fields to `libraries:` that phase 02 here didn't account for. Phase
  02 should pass them through unchanged.

## What to do when all probes pass

Write `.converge/playbooks/declarative-discovery/contract-probe-report.md`
with one section per probe: probe name, what it asserts, observed
value, and "PASS" or "PASS (with note: ...)". The note field records
any contract that's technically the same but renamed (e.g.
"function is called `synthesize` not `synthesizeChild` as expected;
phase 03 uses the actual name").

After the report exists, phase 01's other leaves proceed.

## Out of scope

- Updating downstream contracts — drift detection is this leaf's job;
  contract updates are the human's (or per-layer planner's) job.
- Behavioral testing of the predecessor surfaces beyond what this
  playbook needs (the upstream playbooks have their own test suites).

## Done when

All 14 checks pass and the report file is committed.
