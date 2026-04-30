---
id: 01-red
title: Red — failing tests for selection parser and resolver
description: |
  Write the unit tests that capture the parser and resolver contract. Run
  them. Confirm RED. No implementation yet — the source files don't exist.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/core/tests/unit/select/parser.test.ts"
  - "packages/core/tests/unit/select/resolver.test.ts"

checks:
  - id: tests-exist
    cmd: |
      test -s packages/core/tests/unit/select/parser.test.ts
      test -s packages/core/tests/unit/select/resolver.test.ts
    description: Both test files exist and are non-empty.
  - id: tests-fail
    cmd: |
      test -e packages/core/tests/unit/select && cd packages/core && ! pnpm test -- tests/unit/select
    description: Tests fail (RED) — implementation does not yet exist.
  - id: tests-have-assertions
    cmd: |
      grep -cE 'expect\(|assert' packages/core/tests/unit/select/parser.test.ts | awk '$1+0 < 5 { exit 1 }'
      grep -cE 'expect\(|assert' packages/core/tests/unit/select/resolver.test.ts | awk '$1+0 < 5 { exit 1 }'
    description: Each test file has at least 5 assertions (no faking RED with empty tests).

tags:
  - tdd
  - red
---

# Red — failing tests

Write `packages/core/tests/unit/select/parser.test.ts` and
`resolver.test.ts`. Cover, at minimum:

**parser.test.ts:**
- Bare value defaults to name:: `parseSelector('foo')` is a `name:foo`.
- `parseSelector('tag:image')` recognizes the tag method.
- `parseSelector('03-tokens+')` parses the descendants operator.
- `parseSelector('+03-tokens')` parses the ancestors operator.
- `parseSelector('+03-tokens+')` parses both.
- `parseSelector('2+task')` and `'task+3'` parse depth limits.
- `parseSelector('@06-storyboard')` parses @.
- `parseSelector('*keyframe*')` parses globs.
- `parseSelector('a b')` is a union of two atoms.
- `parseSelector('a,b')` is an intersection of two atoms.
- `parseSelector('tag:a,phase:b c')` mixes ops correctly (comma > space).
- All seven `state:modified.{body,frontmatter,checks,inputs,upstream,playbook,drifted}` parse.
- `frontier:`, `expected:`, `concrete:`, `wbs:`, `selector:` parse.

**resolver.test.ts:**
- Resolver against a small fixture context (manifest stub) returns the
  right ID set for each operator above.
- `parent+` over an unseeded WBS parent surfaces a frontier flag (the
  resolver returns the result *plus* a list of crossed frontiers — the
  warning rendering itself is the CLI's job, not the resolver's).
- Set ops: union and intersection compose correctly.
- `--exclude` semantics: subtract after select.

Run `pnpm test -- tests/unit/select` — confirm RED. The files
`packages/core/src/select/{parser,resolver,index}.ts` do not exist yet,
so imports fail. That is the expected RED state.

**Discipline:** if any test passes, you've either written a tautological
test or the implementation already exists in a different form. Fix it.
