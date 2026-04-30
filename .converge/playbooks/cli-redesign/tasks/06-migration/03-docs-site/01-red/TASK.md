---
id: 01-red
title: Red — failing existence-check for new docs pages
description: |
  A small bash check script that exits non-zero unless every referenced
  CLI doc page exists. Initially RED because most pages don't exist yet.

dependencies: []

outputs:
  - "packages/cli/tests/integration/docs-pages-exist.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/docs-pages-exist.test.ts
    description: Test exists.
  - id: test-fails
    cmd: test -e packages/cli/tests/integration/docs-pages-exist.test.ts && cd packages/cli && ! pnpm test -- tests/integration/docs-pages-exist.test.ts
    description: Test fails (RED) — most v2 pages are missing.

tags:
  - tdd
  - red
---

# Red — docs page existence test

```ts
const PAGES = ['build','test','compile','list','clean','debug','deps','retry','source','select'];
describe('v2 CLI reference pages', () => {
  it.each(PAGES)('%s.md exists and is non-trivial', (name) => {
    const p = path.join(REPO, 'docs/reference/cli', `${name}.md`);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(200);
  });
});
```

Plus an additional check that the design doc's status banner has
moved to "shipped" or "shipping". RED.
