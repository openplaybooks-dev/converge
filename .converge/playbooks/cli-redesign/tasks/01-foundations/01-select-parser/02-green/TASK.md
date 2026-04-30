---
id: 02-green
title: Green — implement parser and resolver until tests pass
description: |
  Implement packages/core/src/select/{types,parser,resolver,index}.ts
  until all tests written in 01-red pass. Refactor while green.

dependencies:
  - 01-red

inputs:
  - "packages/core/tests/unit/select/parser.test.ts"
  - "packages/core/tests/unit/select/resolver.test.ts"
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/core/src/select/types.ts"
  - "packages/core/src/select/parser.ts"
  - "packages/core/src/select/resolver.ts"
  - "packages/core/src/select/index.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Selection module typechecks.
  - id: tests-pass
    cmd: cd packages/core && pnpm test -- tests/unit/select
    description: All tests from 01-red now pass (GREEN).
  - id: api-exposed
    cmd: |
      node -e "const m=require('./packages/core/dist/select/index.js');
      if(typeof m.parseSelector!=='function')process.exit(1);
      if(typeof m.resolveSelection!=='function')process.exit(1);"
    description: parseSelector and resolveSelection are the public API.
  - id: no-test-file-changes
    cmd: |
      git diff --name-only HEAD -- packages/core/tests/unit/select/ | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Test files were not edited during the green phase (no moving the goalposts).

tags:
  - tdd
  - green
---

# Green — implement until tests pass

Write the four source files. The tests from `01-red` are the spec; do not
edit them.

**`types.ts`** — the AST. A discriminated union: graph nodes (with depth
limits), method nodes (with method + value), set ops (union / intersect /
exclude), atoms.

**`parser.ts`** — string -> AST. Hand-rolled recursive-descent is fine
(the grammar is small). Tokenize on whitespace and `,`; recognize prefix
`+`, suffix `+`, leading digits before `+`, trailing digits after `+`,
`@` prefix, `*` glob chars, and `method:value` patterns.

**`resolver.ts`** — AST + ResolutionCtx -> `{ ids: Set<string>, frontiers:
string[] }`. `ResolutionCtx` is an interface (defined here) that the
manifest module will later implement. Keep the resolver pure: it doesn't
read disk.

**`index.ts`** — re-exports the public API only.

Refactor while green. If you add a helper, run tests after each rename
or extraction. Do not edit the test files.

If a test is wrong, that's a separate concern: revert your green edit,
go back to 01-red, fix the test, return.
