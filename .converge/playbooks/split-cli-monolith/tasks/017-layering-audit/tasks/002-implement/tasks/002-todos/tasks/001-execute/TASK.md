---
id: 001-execute
title: "Execute: ESLint no-restricted-imports enforcing onion direction. madge in CI. Programmatic smoke test that drives autonomousRun from engine without touching cli/display."
---

Implement the PR.

**Summary:** ESLint no-restricted-imports enforcing onion direction. madge in CI. Programmatic smoke test that drives autonomousRun from engine without touching cli/display.

**Spec:**
Final audit PR. Codifies the onion architecture in tooling so future changes cannot silently invert it.

**ESLint `no-restricted-imports` rules:**

Add to the root ESLint config (or per-package `.eslintrc.cjs`):

```js
// packages/core/.eslintrc.cjs
rules: {
  'no-restricted-imports': ['error', {
    patterns: [{ group: ['@converge/*'], message: 'Core is the innermost primitive — cannot import other @converge/* packages.' }],
  }],
}

// packages/navigator/.eslintrc.cjs + packages/journal/.eslintrc.cjs + packages/scheduler/.eslintrc.cjs + packages/display/.eslintrc.cjs
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      { group: ['@converge/engine', '@converge/cli'], message: 'Leaf primitive — cannot import middle or outer layers.' },
      // scheduler is allowed to import journal + core; navigator/display/journal must specify their exact allowed deps
    ],
  }],
}

// packages/engine/.eslintrc.cjs
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      { group: ['@converge/cli', '@converge/display'], message: 'Engine is I/O-agnostic — cannot import CLI or display.' },
    ],
  }],
}

// packages/cli/ — allowed to import everything below it. No restrictions.
```

Verify: `pnpm -r lint` passes with these rules enabled.

**madge circular-import CI job:**

Add to `.github/workflows/` (or the existing CI config):
```yaml
- name: Check import graph
  run: pnpm exec madge --circular --extensions ts packages/{core,navigator,journal,scheduler,display,engine,cli}/src
```

**Programmatic smoke test — the web UI integration pattern:**

Write `packages/engine/tests/smoke/programmatic.test.ts`:

```ts
import { autonomousRun } from '@converge/engine';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Intentionally NO imports from @converge/cli or @converge/display.
// This test proves a web UI (or any non-terminal embedder) can drive the
// engine end-to-end using only the programmatic API.

test('autonomousRun drives fixture playbook without CLI/display', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'converge-smoke-'));
  try {
    // Set up a minimal fixture playbook in `tmp`
    // ...
    const result = await autonomousRun({
      projectDir: tmp,
      playbook: 'fixture-minimal',
      maxIterations: 5,
      dryRun: true,
      // eventSink, progressCallback, etc. — injected, not assumed
    });
    expect(result.status).toBe('completed');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
```

**Import guard** (vitest config or test file top):
```ts
// eslint-disable-next-line no-restricted-imports
import * as cliModule from '@converge/cli';  // expected to fail at compile time if added
```

**Full end-to-end verification:**
```bash
# 1. All packages build
pnpm -r build

# 2. All tests pass (unit + integration + smoke)
pnpm -r test

# 3. No circular imports
pnpm exec madge --circular --extensions ts packages/*/src

# 4. Linter enforces onion
pnpm -r lint

# 5. CLI smoke matrix
converge --help && converge status && converge verify
converge run --dry --max-iterations=1 --playbook=default
converge show gantt && converge show graph && converge inspect
converge plan "test" --dry

# 6. SIGINT
# (manual: converge run + Ctrl-C → exits cleanly within 10s)

# 7. swebench + tbench (downstream consumers)
pnpm --filter swebench test
pnpm --filter tbench test

# 8. Clean-install hygiene
rm -rf node_modules; pnpm install
pnpm -r build
```

**Acceptance:**
- ESLint rules enabled and enforced; `pnpm -r lint` clean
- madge CI job passes — zero circular imports across packages
- Programmatic smoke test passes (engine drives autonomousRun without cli/display)
- Full smoke matrix passes
- SIGINT test passes
- swebench + tbench green
- Clean install produces green builds + tests
- Documentation updated: root README + each package README explains the onion layering

**Analysis:** `D:/converge/.converge/artifacts/split-cli/017-layering-audit/analyze/plan.md`
