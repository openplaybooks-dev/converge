---
id: 01-foundations
title: Foundations — selection parser, manifest schema, content-hash primitives
description: |
  Three pure libraries land under packages/core/src/, fully unit-tested via
  red-green-refactor TDD, with no CLI wiring. Anything that fixes the shape
  of the manifest or the grammar of --select goes here so later phases
  inherit a frozen contract.

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/playbook/hash.ts"

outputs:
  - "packages/core/src/select/parser.ts"
  - "packages/core/src/select/types.ts"
  - "packages/core/src/select/index.ts"
  - "packages/core/tests/unit/select/parser.test.ts"
  - "packages/core/src/manifest/schema.ts"
  - "packages/core/src/manifest/writer.ts"
  - "packages/core/src/manifest/reader.ts"
  - "packages/core/src/manifest/index.ts"
  - "packages/core/tests/unit/manifest/writer.test.ts"
  - "packages/core/tests/unit/manifest/reader.test.ts"
  - "packages/core/src/hash/task.ts"
  - "packages/core/src/hash/index.ts"
  - "packages/core/tests/unit/hash/task.test.ts"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm -r typecheck
    description: Whole-monorepo typecheck passes (no broken imports from new modules).
  - id: tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/select tests/unit/manifest tests/unit/hash
    description: New unit tests under select/ manifest/ hash/ pass.
  - id: select-types-frozen
    cmd: |
      node -e "const m=require('./packages/core/dist/select/index.js');
      if(typeof m.parseSelector!=='function')process.exit(1);
      if(typeof m.resolveSelection!=='function')process.exit(1);"
    description: select/ exposes parseSelector and resolveSelection as the public surface.
  - id: manifest-schema-frozen
    cmd: |
      node -e "const m=require('./packages/core/dist/manifest/index.js');
      if(typeof m.writeManifest!=='function')process.exit(1);
      if(typeof m.readManifest!=='function')process.exit(1);
      if(typeof m.MANIFEST_VERSION==='undefined')process.exit(1);"
    description: manifest/ exposes writeManifest, readManifest, MANIFEST_VERSION.
  - id: no-cli-wiring
    cmd: |
      ! grep -rEl "from ['\"].*src/(select|manifest|hash)" packages/cli/src/ 2>/dev/null
    description: Phase 01 does not touch packages/cli/. Selection/manifest/hash are pure libs.

tags:
  - phase
  - foundations

vars:
  test_glob_select: tests/unit/select/**/*.test.ts
  test_glob_manifest: tests/unit/manifest/**/*.test.ts
  test_glob_hash: tests/unit/hash/**/*.test.ts
---

# Foundations

## Scope

Three pure libraries, no CLI wiring. When this phase is done, a future phase
can `import { parseSelector, resolveSelection } from "@converge/core/select"`
or equivalent and trust the API.

The libraries are:

1. **`packages/core/src/select/`** — the `--select` / `--exclude` DSL parser
   and resolver. Implements §4 of `docs/design/cli-redesign.md` *except*
   anything that requires a manifest (those resolvers compose with the
   manifest module). Public API:
   - `parseSelector(expr: string): SelectorAST` — parses the DSL into an
     AST. Handles graph operators (`+`, `+N`, `N+`, `@`, `*`), method
     selectors (`tag:`, `path:`, `phase:`, `status:`, `result:`,
     `state:modified.*`, `wbs:`, `frontier:`, `expected:`, `concrete:`,
     `attempt:`, `selector:`, `name:`), set operators (space=union,
     comma=intersection), and bare values defaulting to `name:`.
   - `resolveSelection(ast: SelectorAST, ctx: ResolutionCtx): Set<string>` —
     resolves an AST against a manifest+journal context, returns task IDs.
     `ResolutionCtx` is a small interface so the resolver doesn't depend on
     the full manifest module's concrete types.

2. **`packages/core/src/manifest/`** — the `target/manifest.json` and
   `target/run_results.json` schema, writer, and reader. Implements §6 of
   the spec. Public API:
   - `MANIFEST_VERSION` — string constant, written into every manifest.
   - `writeManifest(targetDir: string, m: Manifest): Promise<void>` — atomic
     write (temp file + rename), no partial writes on crash.
   - `readManifest(targetDir: string): Promise<Manifest | null>` — returns
     null if absent, throws if version mismatch.
   - Same pair for `RunResults` / `writeRunResults` / `readRunResults`.
   - The `state` field on each node (`concrete` | `expected` | `frontier`)
     is enforced by the type — invalid states are a TypeScript error.

3. **`packages/core/src/hash/`** — content-hashing primitives for tasks.
   Implements §7.3 of the spec. Public API:
   - `hashTaskFrontmatter(fm: TaskFrontmatter): string` — sha256, sorted
     keys, no whitespace sensitivity.
   - `hashTaskBody(body: string): string` — sha256 of normalized body
     (trailing whitespace stripped per line, terminal newline normalized).
   - `hashTaskChecks(checks: CheckDef[]): string` — sha256 of the checks
     block alone.
   - `hashInputs(projectDir: string, inputs: string[]): Promise<string>` —
     sha256 over file contents in declared order. Skips files marked too
     large (configurable threshold; default 50 MB, with a clear log line
     when skipped).
   - `hashUpstream(parents: TaskHashes[]): string` — rollup of parents'
     (frontmatter, body, inputs) hashes.

   These extend, not replace, the existing
   `packages/core/src/playbook/hash.ts` (which hashes the whole playbook
   directory; that becomes `hashPlaybook` and continues to feed the
   `playbook_hash` manifest field).

## TDD discipline

This phase has no CLI, no integration tests — pure unit tests. Every leaf
under this phase follows red-green-refactor:

1. Write the failing test for the API surface above.
2. Run it — confirm RED.
3. Implement until GREEN.
4. Refactor while GREEN.

Each leaf's `checks:` will mechanically include `vitest run` against its
test glob; the per-layer planner elaborates which leaves exist and how they
split (e.g., one leaf per selector method, one leaf per hash function, or
grouped by file — the planner decides).

## Out of scope

- Wiring any of these libraries into the CLI. That's phase 02.
- The `state:modified.*` resolution logic that requires diffing two
  manifests. The *parsing* of those selectors lands here; the *resolution*
  against a `--state` manifest lands in phase 04.
- WBS preview-manifest reading. Phase 02.

## References

- Spec: `docs/design/cli-redesign.md` §4 (DSL), §6 (manifest), §7.3 (hashes).
- Existing hash module: `packages/core/src/playbook/hash.ts` — extend, don't
  replace.
- Test pattern to copy: `packages/core/tests/unit/checkpoint/checkpoint-cursor.test.ts`.

## Open questions for the per-layer planner

- How many leaves does this phase decompose into? Ballpark: 3 leaves (one
  per library) is too coarse — each library's TDD work is several days.
  10+ leaves (one per selector method × red/green/refactor) is too fine.
  Aim for 5–8: probably one leaf per *file* or per logically-coherent slice
  (e.g. "graph operators", "method selectors", "set operators" inside
  select/), each doing red-green-refactor in one shot.
- Whether to land all three libraries' tests in one test glob or three.
