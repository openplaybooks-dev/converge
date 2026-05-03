---
id: 01-select-parser
title: Selection DSL parser and resolver
description: |
  Parser + resolver for the --select / --exclude DSL. Public API:
  parseSelector(expr) -> SelectorAST, resolveSelection(ast, ctx) -> Set<id>.
  Handles graph operators (+, +N, N+, @, *), method selectors (tag:, path:,
  phase:, status:, result:, state:modified.*, wbs:, frontier:, expected:,
  concrete:, attempt:, selector:, name:), set ops (space=union,
  comma=intersection), and bare values defaulting to name:.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/core/src/select/types.ts"
  - "packages/core/src/select/parser.ts"
  - "packages/core/src/select/resolver.ts"
  - "packages/core/src/select/index.ts"
  - "packages/core/tests/unit/select/parser.test.ts"
  - "packages/core/tests/unit/select/resolver.test.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Selection module typechecks.
  - id: tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/select
    description: Parser and resolver unit tests pass.
  - id: public-api-shape
    cmd: |
      node -e "const m=require('./packages/core/dist/select/index.js');
      if(typeof m.parseSelector!=='function')process.exit(1);
      if(typeof m.resolveSelection!=='function')process.exit(1);"
    description: select/index.ts exports parseSelector and resolveSelection.

tags:
  - foundations
  - selection
children:
  - 01-red
  - 02-green
---

# Selection DSL parser and resolver

Two TDD subtasks: `01-red` writes the failing tests; `02-green` implements
the parser and resolver until tests pass, then refactors while green.

The slice's contract is the public API surface. The split between parser
(string -> AST) and resolver (AST + context -> task IDs) is a decision
this slice makes; both land here so the API is exercised end-to-end by
unit tests.

References: `docs/design/cli-redesign.md` §4 (DSL definition).
