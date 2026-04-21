---
id: 004-quality
title: Quality gate — PR14 — Final layering gate (ESLint + madge + programmatic smoke)
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd D:/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd D:/converge && pnpm test 2>&1 | tail -1"
  - id: cli-smoke
    description: converge --help runs (tolerates pre/post-PR13 bin location)
    cmd: "cd D:/converge && node packages/core/dist/cli/main.js --help >/dev/null 2>&1 || node packages/cli/dist/main.js --help >/dev/null 2>&1"
vars:
  taskId: 004-quality
  parentId: 017-layering-audit
  title: PR14 — Final layering gate (ESLint + madge + programmatic smoke)
  tier: 6 — Audit
  task: ESLint no-restricted-imports enforcing onion direction. madge in CI. Programmatic smoke test that drives autonomousRun from engine without touching cli/display.
  spec: "Final audit PR. Codifies the onion architecture in tooling so future changes cannot silently invert it.\n\n**ESLint `no-restricted-imports` rules:**\n\nAdd to the root ESLint config (or per-package `.eslintrc.cjs`):\n\n```js\n// packages/core/.eslintrc.cjs\nrules: {\n  'no-restricted-imports': ['error', {\n    patterns: [{ group: ['@converge/*'], message: 'Core is the innermost primitive — cannot import other @converge/* packages.' }],\n  }],\n}\n\n// packages/navigator/.eslintrc.cjs + packages/journal/.eslintrc.cjs + packages/scheduler/.eslintrc.cjs + packages/display/.eslintrc.cjs\nrules: {\n  'no-restricted-imports': ['error', {\n    patterns: [\n      { group: ['@converge/engine', '@converge/cli'], message: 'Leaf primitive — cannot import middle or outer layers.' },\n      // scheduler is allowed to import journal + core; navigator/display/journal must specify their exact allowed deps\n    ],\n  }],\n}\n\n// packages/engine/.eslintrc.cjs\nrules: {\n  'no-restricted-imports': ['error', {\n    patterns: [\n      { group: ['@converge/cli', '@converge/display'], message: 'Engine is I/O-agnostic — cannot import CLI or display.' },\n    ],\n  }],\n}\n\n// packages/cli/ — allowed to import everything below it. No restrictions.\n```\n\nVerify: `pnpm -r lint` passes with these rules enabled.\n\n**madge circular-import CI job:**\n\nAdd to `.github/workflows/` (or the existing CI config):\n```yaml\n- name: Check import graph\n  run: pnpm exec madge --circular --extensions ts packages/{core,navigator,journal,scheduler,display,engine,cli}/src\n```\n\n**Programmatic smoke test — the web UI integration pattern:**\n\nWrite `packages/engine/tests/smoke/programmatic.test.ts`:\n\n```ts\nimport { autonomousRun } from '@converge/engine';\nimport { mkdtempSync, rmSync } from 'node:fs';\nimport { tmpdir } from 'node:os';\nimport { join } from 'node:path';\n\n// Intentionally NO imports from @converge/cli or @converge/display.\n// This test proves a web UI (or any non-terminal embedder) can drive the\n// engine end-to-end using only the programmatic API.\n\ntest('autonomousRun drives fixture playbook without CLI/display', async () => {\n  const tmp = mkdtempSync(join(tmpdir(), 'converge-smoke-'));\n  try {\n    // Set up a minimal fixture playbook in `tmp`\n    // ...\n    const result = await autonomousRun({\n      projectDir: tmp,\n      playbook: 'fixture-minimal',\n      maxIterations: 5,\n      dryRun: true,\n      // eventSink, progressCallback, etc. — injected, not assumed\n    });\n    expect(result.status).toBe('completed');\n  } finally {\n    rmSync(tmp, { recursive: true, force: true });\n  }\n});\n```\n\n**Import guard** (vitest config or test file top):\n```ts\n// eslint-disable-next-line no-restricted-imports\nimport * as cliModule from '@converge/cli';  // expected to fail at compile time if added\n```\n\n**Full end-to-end verification:**\n```bash\n# 1. All packages build\npnpm -r build\n\n# 2. All tests pass (unit + integration + smoke)\npnpm -r test\n\n# 3. No circular imports\npnpm exec madge --circular --extensions ts packages/*/src\n\n# 4. Linter enforces onion\npnpm -r lint\n\n# 5. CLI smoke matrix\nconverge --help && converge status && converge verify\nconverge run --dry --max-iterations=1 --playbook=default\nconverge show gantt && converge show graph && converge inspect\nconverge plan \"test\" --dry\n\n# 6. SIGINT\n# (manual: converge run + Ctrl-C → exits cleanly within 10s)\n\n# 7. swebench + tbench (downstream consumers)\npnpm --filter swebench test\npnpm --filter tbench test\n\n# 8. Clean-install hygiene\nrm -rf node_modules; pnpm install\npnpm -r build\n```\n\n**Acceptance:**\n- ESLint rules enabled and enforced; `pnpm -r lint` clean\n- madge CI job passes — zero circular imports across packages\n- Programmatic smoke test passes (engine drives autonomousRun without cli/display)\n- Full smoke matrix passes\n- SIGINT test passes\n- swebench + tbench green\n- Clean install produces green builds + tests\n- Documentation updated: root README + each package README explains the onion layering"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/017-layering-audit"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR14 — Final layering gate (ESLint + madge + programmatic smoke)

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
