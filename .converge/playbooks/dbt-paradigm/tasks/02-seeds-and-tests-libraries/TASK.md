---
title: Schema and loader for seeds/ and tests/; widen checks: to accept test references
description: |
  Land the schema modules for the two libraries and extend the task-md
  parser so a check can be either inline (existing) or a test reference
  (new). The config loader discovers both libraries and expands every
  test reference into an inline check at parse time. No runtime impact
  yet, no DAG impact yet, WBS still in place.

inputs:
  - .converge/playbooks/dbt-paradigm/REFS.md
  - docs/design/dbt-paradigm.md
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/loader.ts
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/core/src/config/seed-md-definition.ts
  - packages/core/src/config/test-md-definition.ts
  - packages/core/src/config/test-expander.ts
  - packages/core/src/config/loader.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/tests/config/seed-md-definition.test.ts
  - packages/core/tests/config/test-md-definition.test.ts
  - packages/core/tests/config/test-expander.test.ts
  - packages/core/tests/config/loader-libraries.test.ts
  - packages/cli/tests/fixtures/minimal-playbook/seeds
  - packages/cli/tests/fixtures/minimal-playbook/tests

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck after schema changes.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All core and CLI tests pass.
  - id: seed-md-definition-present
    cmd: test -s packages/core/src/config/seed-md-definition.ts
    description: Seed schema module exists.
  - id: test-md-definition-present
    cmd: test -s packages/core/src/config/test-md-definition.ts
    description: Test schema module exists.
  - id: test-expander-present
    cmd: test -s packages/core/src/config/test-expander.ts
    description: Test-reference expander exists.
  - id: fixture-has-libraries
    cmd: test -d packages/cli/tests/fixtures/minimal-playbook/seeds && test -d packages/cli/tests/fixtures/minimal-playbook/tests
    description: Test fixture has both library directories.
  - id: wbs-still-works
    cmd: pnpm --filter @converge/core test -- wbs
    description: Existing WBS tests still pass — no regression.

skills: []
references:
  - "docs/design/dbt-paradigm.md"
  - ".converge/playbooks/dbt-paradigm/REFS.md"

vars: {}
dependencies:
  - 01-survey-and-paradigm-spec
---

# 02 — Seeds and tests libraries (schema only)

Strict red-green-refactor at every leaf. For each file created below,
the leaf order is: write failing test → run → red → implement → green →
refactor.

## What lands

### Schema modules

- **`packages/core/src/config/seed-md-definition.ts`** — parses a single
  `<name>.seed.md` file. Frontmatter fields per the design doc: `name:`,
  `description:`, `args:` (schema), optional `kind: context | spawning`
  (default per design doc), optional `preview_manifest:` for spawning
  seeds (path to an upstream catalog file that lets `compile` predict
  spawned children as `expected` instead of `frontier`). Body holds the
  prep/spawn instructions.

- **`packages/core/src/config/test-md-definition.ts`** — parses a single
  `<name>.test.md` file. Frontmatter: `name:`, `description:`, `args:`
  (schema). Body or a `cmd:` field carries a check template with
  `{{ args.* }}` placeholders.

Mirror the existing `task-md-definition.ts` style (zod schemas + a
`parse<Kind>Md` function returning a typed result + a clear error message
on unknown frontmatter fields).

### Task schema widening

Extend `packages/core/src/config/task-md-definition.ts`:

- Accept a top-level `seeds:` array. Each entry is either a bare string
  (`"per-token"`) or an invocation form (`"render-template(template=foo)"`)
  or an object form (`{ name: "render-template", args: { template: "foo" } }`).
- Widen the `checks:` array element type to a discriminated union:
  - `InlineCheck` (existing shape: `{ id, cmd, description }`).
  - `TestRefCheck`: object form `{ type: "test", name, args? }` or string
    shorthand `"test:<name>(args?)"`.
- Add a sibling field on the parsed task that records the original
  test-reference names (pre-expansion) for the `test:` selector to read.
  Suggested shape: `_testRefs: string[]`. Not user-facing.

Do not delete the `wbs:` field in this phase. Phase 04 pass A handles it.

### The expander

`packages/core/src/config/test-expander.ts` exports a pure function:

```ts
expandTestRefs(
  task: ParsedTask,
  registry: Map<string, TestDef>,
): ParsedTask  // checks: array now contains only InlineCheck entries
```

Behavior:
- For each `TestRefCheck` in `task.checks`, look up the test by name in
  the registry.
- If the test isn't found, throw a structured `UnresolvedTestRefError`
  carrying the task path, the missing name, and the registry's known
  names (for a helpful error message).
- Validate the supplied `args` against the test's `args:` schema. Throw
  on type mismatch.
- Substitute `{{ args.<key> }}` placeholders in the test's `cmd:` (or
  body) template. Use a small substitution helper — do not pull in a
  templating library.
- Synthesize an `InlineCheck`: `id` defaults to `<task-id>--test-<name>`
  unless the task already has a check with that id; in that case append
  a numeric suffix.
- Return a new task object with the expanded `checks:` and the original
  test-reference names recorded in `_testRefs`.

### Loader integration

`packages/core/src/config/loader.ts`:
- Reuse the existing playbook walker. Add two passes after `tasks/`:
  walk `<playbook>/seeds/*.seed.md` building a `Map<name, SeedDef>`,
  and `<playbook>/tests/*.test.md` building a `Map<name, TestDef>`.
- Validate names are unique within each library.
- After parsing every task, run `expandTestRefs(task, testsRegistry)`.
- Validate `seeds:` references — every name resolves to a `SeedDef`.
  Throw `UnresolvedSeedRefError` otherwise.
- Expose the two registries on the loader's return value (alongside the
  existing tasks tree). Downstream code (manifest, runtime, selectors)
  can read them in phase 03.

### Fixture extension

Extend `packages/cli/tests/fixtures/minimal-playbook/`:
- Add `seeds/` with one tiny context seed and one tiny spawning seed.
- Add `tests/` with one reusable test (something boring like a freshness
  check that takes a `path:` arg).
- Add one task whose `checks:` includes the test reference and whose
  `seeds:` references both seeds.

Do not add a separate fixture; extend the existing one.

## TDD discipline

Write one failing test first per file:
- `seed-md-definition.test.ts` — parse a fixture seed file; assert frontmatter fields and body.
- `test-md-definition.test.ts` — same for a fixture test file.
- `test-expander.test.ts` — the four cases: success, unresolved-ref error,
  arg-validation error, id-collision suffix.
- `loader-libraries.test.ts` — load the extended fixture; assert both
  registries have the right entries; assert the test-referencing task
  has expanded checks; assert `_testRefs` records the original name.

Each test must be RED first. Refactor only while green.

## Out of scope (do not touch)

- Manifest changes (phase 03).
- Selector additions (phase 03).
- Runtime hooks (phase 03).
- Deletion of `wbs:` field or executor (phase 04).
- Migration of any user playbook (phase 05).

## Done when

All seven checks pass and a fresh `pnpm -r test` is green. The CLI's
`--select` grammar, the manifest format, and the runtime are all
unchanged from before this phase.
