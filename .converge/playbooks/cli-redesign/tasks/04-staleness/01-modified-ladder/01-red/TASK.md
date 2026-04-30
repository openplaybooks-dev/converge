---
id: 01-red
title: Red — failing tests for the seven state:modified sub-methods
description: |
  Parameterized test: for each of the seven sub-methods, build two
  manifests with a controlled delta on exactly that dimension, assert
  the resolver flags the right node. Confirm RED.

dependencies: []

outputs:
  - "packages/core/tests/unit/select/state-resolver.test.ts"
  - "packages/cli/tests/integration/state-modified.test.ts"

checks:
  - id: tests-exist
    cmd: |
      test -s packages/core/tests/unit/select/state-resolver.test.ts
      test -s packages/cli/tests/integration/state-modified.test.ts
    description: Both test files exist.
  - id: tests-fail
    cmd: |
      cd packages/core && pnpm test -- tests/unit/select/state-resolver.test.ts 2>&1; test $? -ne 0
    description: Tests fail (RED) — resolver doesn't exist yet.
  - id: assertions-cover-all-seven
    cmd: |
      for m in body frontmatter checks inputs upstream playbook drifted; do
        grep -q "modified.$m" packages/core/tests/unit/select/state-resolver.test.ts || { echo "missing $m"; exit 1; }
      done
    description: All seven sub-methods are referenced in the unit test.

tags:
  - tdd
  - red
---

# Red — seven sub-methods

Use `describe.each([...]) ` style to parameterize over the seven
sub-methods. For each:

1. Build a "before" manifest fixture with one task at a known set of
   hashes.
2. Build an "after" manifest with exactly one hash field changed
   (the one matching the sub-method).
3. Resolve `state:modified.<method>` against the before manifest as
   `--state`.
4. Assert the resolver returns the modified task ID.
5. Assert it does NOT return tasks where only an *unrelated* field
   changed.

The integration test (`packages/cli/tests/integration/state-modified.test.ts`)
runs the full CLI: snapshot a fixture's compile output, edit one
TASK.md (per sub-method), recompile, run `list --select 'state:modified.<m>'
--state /tmp/snap`, assert the output. RED.
