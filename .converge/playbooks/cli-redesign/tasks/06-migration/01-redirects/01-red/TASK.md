---
id: 01-red
title: Red — parameterized failing test for every migration row
description: |
  Single test file with describe.each over the rows from spec §10. Each
  case asserts: `converge <oldCommand>` exits non-zero, stderr matches a
  per-row regex (the v2 hint). Confirm RED.

dependencies: []

outputs:
  - "packages/cli/tests/integration/migration-redirects.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/migration-redirects.test.ts
    description: Test exists.
  - id: test-fails
    cmd: test -e packages/cli/tests/integration/migration-redirects.test.ts && cd packages/cli && ! pnpm test -- tests/integration/migration-redirects.test.ts
    description: Test fails (RED).
  - id: covers-spec-rows
    cmd: |
      # Sanity: at least 15 rows of the migration table covered.
      grep -cE 'oldCommand:|"oldCommand":|cmd:' packages/cli/tests/integration/migration-redirects.test.ts | awk '$1+0 < 15 { exit 1 }'
    description: At least 15 distinct migration rows referenced in the test.

tags:
  - tdd
  - red
---

# Red — parameterized migration test

The MIGRATION_ROWS array enumerates each row of spec §10. Sample rows:

```ts
const MIGRATION_ROWS = [
  { old: ['verify'],            hint: /use:?\s+converge\s+debug/i },
  { old: ['verify', '--fix'],   hint: /use:?\s+converge\s+debug\s+--fix/i },
  { old: ['status'],            hint: /use:?\s+converge\s+(list|show graph)/i },
  { old: ['reset', 'pb', 'task'], hint: /use:?\s+converge\s+clean/i },
  { old: ['playbook', 'list'],  hint: /use:?\s+converge\s+list\s+--playbooks/i },
  { old: ['playbook', 'info', 'X'], hint: /use:?\s+converge\s+inspect\s+playbook/i },
  { old: ['skills', 'list'],    hint: /use:?\s+converge\s+deps\s+list/i },
  { old: ['skills', 'install'], hint: /use:?\s+converge\s+deps\s+install/i },
  { old: ['goals'],             hint: /use:?\s+converge\s+build/i },
  { old: ['cleanup'],           hint: /use:?\s+converge\s+clean\s+--orphaned/i },
  { old: ['plan', 'goal text'], hint: /use:?\s+converge\s+init\s+--from-prompt/i },
  { old: ['checkpoint'],        hint: /use:?\s+converge\s+inspect\s+checkpoint/i },
  { old: ['plugins'],           hint: /use:?\s+converge\s+deps\s+list/i },
  // ... cover all of spec §10
];

describe.each(MIGRATION_ROWS)('redirect for $old', ({ old, hint }) => {
  it('exits non-zero with v2 hint on stderr', () => {
    const result = spawnSync('node', [CLI, ...old], { cwd: fixtureDir });
    expect(result.status).not.toBe(0);
    expect(result.stderr.toString()).toMatch(hint);
  });
});
```

Confirm RED — most rows aren't yet wired through a redirect (some may
already exist as legacy redirects in main.ts; those rows pass
incidentally — the green slice unifies them under MIGRATION_REDIRECTS).
