---
id: 02-compile-and-list
title: Compile and list — read-only verbs that produce manifests
description: |
  Three new CLI verbs land: `converge compile`, `converge list`, and the
  `compile --seed` mode. They are read-only — no task execution, no journal
  writes outside `target/`. First user-visible v2 surface; deliberately
  scoped before any execution path is touched.

dependencies:
  - 01-foundations

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/select/index.ts"
  - "packages/core/src/manifest/index.ts"
  - "packages/core/src/hash/index.ts"
  - "packages/core/src/executor/wbs-executor.ts"

outputs:
  - "packages/cli/src/commands-compile.ts"
  - "packages/cli/src/commands-list.ts"
  - "packages/cli/tests/fixtures/minimal-playbook/playbook.yml"
  - "packages/cli/tests/integration/compile.test.ts"
  - "packages/cli/tests/integration/list.test.ts"
  - "packages/cli/tests/integration/compile-seed.test.ts"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge-cli typecheck
    description: Typecheck passes.
  - id: cli-builds
    cmd: pnpm --filter @openplaybooks/converge-cli build && test -x packages/cli/dist/index.js
    description: CLI builds end-to-end.
  - id: compile-emits-manifest
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && rm -rf .converge/journal/default/target
      ../../../dist/index.js compile
      test -s .converge/journal/default/target/manifest.json
    description: "compile writes target/manifest.json."
  - id: manifest-has-states
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      node -e "const m=JSON.parse(require('fs').readFileSync('.converge/journal/default/target/manifest.json'));
      const states=new Set(Object.values(m.nodes).map(n=>n.state));
      if(!states.has('concrete'))process.exit(1);"
    description: Manifest nodes carry a `state` field with at least one `concrete`.
  - id: list-prints-selection
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      ../../../dist/index.js list --select 'tag:foo' | grep -q .
    description: "list --select <expr> prints matching tasks."
  - id: list-frontier-warning
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      ../../../dist/index.js list --select 'unseeded-wbs+' 2>&1 | grep -q 'crosses a frontier'
    description: list crossing an unseeded frontier emits the documented warning to stderr.
  - id: integration-tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/compile.test.ts tests/integration/list.test.ts tests/integration/compile-seed.test.ts
    description: All three integration tests pass.
  - id: read-only-discipline
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && rm -rf .converge/journal/default
      ../../../dist/index.js compile
      ../../../dist/index.js list --select '*'
      # After compile + list, nothing should exist except the target/ subtree
      test -d .converge/journal/default/target
      test "$(find .converge/journal/default -mindepth 1 -maxdepth 1 -not -name target | wc -l)" = "0"
    description: compile and list write only under target/, no journal mutation.

tags:
  - phase
  - cli
  - read-only

vars:
  fixture_dir: packages/cli/tests/fixtures/minimal-playbook
children:
  - 01-fixture
  - 02-compile
  - 03-list
  - 04-compile-seed
---

# Compile and list

## Scope

Land the read-only verbs first. When this phase is done:

- `converge compile [--select <expr>]` resolves the static portion of the
  DAG, writes `target/manifest.json` with `concrete` / `expected` /
  `frontier` node states (per §6.1 of the spec), and exits 0. Without
  `--seed`, no WBS scripts are run.
- `converge compile --seed [--select <expr>]` runs the WBS scripts of the
  selected parents (or all unseeded parents if no selector), materializes
  their children to disk, then re-emits the manifest. Frontier nodes
  collapse to concrete or expected.
- `converge list [--select <expr>] [--exclude <expr>]` (alias `ls`)
  resolves a selection against the current manifest and prints one task
  per line. Output format: `<task_id>   [<state>]` for concrete and
  expected nodes; `<task_id>   [frontier]` for frontiers. With no
  `--select`, lists everything in selection order.
- A selection that crosses an unseeded frontier emits the warning shown
  in §4.2 of the spec doc. `--frontier-ok` suppresses to a notice.

## Test fixture

This phase introduces `packages/cli/tests/fixtures/minimal-playbook/` as a
shared on-disk fixture for CLI integration tests. Hand-written, minimal
(2–3 top-level tasks, one of which has a `wbs:` block, one of which has
`tags: [foo]` for selection probing). Later phases reuse this fixture.

The choice — fixture under source control rather than generated in
`beforeAll` — is deliberate: it makes test failures debuggable by hand
(`cd fixture && bin/converge compile`) and keeps test setup fast.

## TDD discipline

Each leaf under this phase follows red-green-refactor. Pattern for the
three integration tests:

1. Write failing integration test that runs the CLI subprocess and asserts
   on filesystem state (`target/manifest.json` exists, contains expected
   nodes, etc.). Test pattern from
   `packages/core/tests/integration/no-eager-journal-writes.test.ts`.
2. Confirm RED.
3. Implement the command in `packages/cli/src/commands-{compile,list}.ts`,
   wire into the existing `packages/cli/src/main.ts` switch.
4. Refactor while GREEN.

## Out of scope

- Any execution verb (`run`, `build`, `test`, `retry`). Phase 03.
- `state:modified` resolution. The selector *parses* in phase 01; resolving
  it against a prior manifest is phase 04.
- `--state` and `--defer` flags. They parse here (since the parser is
  frozen) but are no-ops; phase 04 wires them.

## References

- Spec: `docs/design/cli-redesign.md` §3 (verbs), §6 (manifest), §2 (dynamic
  DAG, frontier handling).
- Existing CLI dispatch: `packages/cli/src/main.ts`. New commands plug into
  the switch; do not rewrite the dispatcher in this phase.
- WBS executor: `packages/core/src/executor/wbs-executor.ts` — invoked
  standalone for `compile --seed`.
- Existing path-based dispatch: keep working (§10 of spec).

## Open questions for the per-layer planner

- The fixture playbook content. Two leaves probably needed: one to design
  and write the fixture (with a checklist of what cases it must cover —
  WBS, tags, dependencies, an unseeded WBS for frontier tests), one per
  command. Or fold fixture-creation into the first leaf.
- Whether `compile --seed` is its own leaf or part of the `compile` leaf.
  Default: own leaf (it's a different code path that invokes WbsExecutor).
- The `--frontier-ok` flag — propose landing it here, but it's also
  consumed by `run`/`build`/`test`. Decide whether to define it here and
  document or defer to phase 03.
