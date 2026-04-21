---
id: 015-slim-core
title: "PR12 — Slim @converge/core to pure primitives"
blocking: true
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js"
vars:
  taskId: 015-slim-core
  title: "PR12 — Slim @converge/core to pure primitives"
  tier: 4 — Engine middle layer
  task: "Core keeps only pure types/contracts: gap, goal/types, config, hooks, functions, context, ai, validation, discovery, metrics types, shims, executor types for swebench/tbench."
  spec: "After PR11c, `@converge/core` still contains some dirs that belong in engine (anything that imports engine or has side effects). This PR audits what's left and finalizes core as **pure primitives**.\n\n**Stays in `@converge/core`:**\n- `gap/` — types + definition; no evaluator (evaluator moved to engine if it was here)\n- `goal/types.ts`, `goal/builders.ts` — Goal types + `goal()` builder\n- `config/` — loaders + types (validate side: no fs operations beyond reading a path — if any, inject a reader)\n- `hooks/` — `HookRegistry`, event types\n- `functions/` — `check()`, `eval()`, `plan()`, `task()` builders + registry\n- `context/` — project/epic/task context types + APIs (`FileSystemAPI`, `ShellAPI` interfaces — implementations plug in)\n- `ai/` — `createAIFactory`, `createProjectAI`, `AIContext`, `AIResponse` types\n- `validation/` — task/project validators, rules\n- `discovery/` — `DiscoveryScanner`, `DiscoveryWatcher` (if pure; if they touch fs, keep but document as I/O primitives)\n- `metrics/` types — `BenchmarkResult` (extraction logic moved to engine)\n- `shims/` — TS polyfills\n- `schedule/` — scheduler type definitions (not the runtime logic — that's `@converge/scheduler`)\n- `client/` — client wrappers if pure; otherwise evaluate\n- **Executor type symbols** for swebench/tbench: `ExecutorFn`, `ExecutorContext`, `BenchmarkResult`\n\n**Removed from core (moved to engine or deleted):**\n- anything still importing `@converge/engine` (would have been caught in PR11c audit)\n- anything creating stateful singletons\n- anything with CLI-flavored side effects (`process.exit`, stdout writes, console logging)\n\n**`packages/core/package.json` dependencies:**\n- Keep: `zod`\n- Remove: `@converge/display` (if still there from PR8 — move to cli's deps)\n- Keep `@converge/journal`/`@converge/scheduler`/`@converge/navigator` IF core uses them at runtime; typically no — they're engine's concern\n- If core is truly types-only, `dependencies` reduces to just `zod`\n\n**Layering audits (REJECT on hit):**\n```bash\n# No CLI leakage\ngrep -rn \"process\\\\.exit\\\\|process\\\\.stdout\\\\.write\\\\|process\\\\.stderr\\\\.write\" packages/core/src && exit 1 || true\ngrep -rn \"console\\\\.\\\\(log\\\\|error\\\\|warn\\\\|info\\\\)\" packages/core/src | grep -v \".test.ts\" && exit 1 || true\n\n# No ANSI\ngrep -rnE \"\\\\\\\\u001b\\\\[|\\\\\\\\x1b\\\\[\" packages/core/src && exit 1 || true\n\n# Core depends on no workspace packages (or only journal/scheduler/navigator if strictly needed)\ngrep -rn \"@converge/\" packages/core/src && exit 1 || true  # strict version; allow exceptions only if justified\n```\n\n**Verification that swebench/tbench still work:**\n- `ExecutorFn`, `ExecutorContext`, `BenchmarkResult` are importable from `@converge/core`\n- swebench + tbench tests green with no code changes beyond what PR11c already did\n\n**Acceptance:**\n- All layering audits clean\n- `pnpm --filter @converge/core test` passes with minimal deps (zod only, ideally)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/core/src` — no cycles\n- Programmatic smoke preview: a script that imports `@converge/engine` and runs `autonomousRun` against a fixture works end-to-end"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/015-slim-core"
  itemTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js\""
---

# PR12 — Slim @converge/core to pure primitives

**Tier:** 4 — Engine middle layer

**Summary:** Core keeps only pure types/contracts: gap, goal/types, config, hooks, functions, context, ai, validation, discovery, metrics types, shims, executor types for swebench/tbench.

## Full specification

After PR11c, `@converge/core` still contains some dirs that belong in engine (anything that imports engine or has side effects). This PR audits what's left and finalizes core as **pure primitives**.

**Stays in `@converge/core`:**
- `gap/` — types + definition; no evaluator (evaluator moved to engine if it was here)
- `goal/types.ts`, `goal/builders.ts` — Goal types + `goal()` builder
- `config/` — loaders + types (validate side: no fs operations beyond reading a path — if any, inject a reader)
- `hooks/` — `HookRegistry`, event types
- `functions/` — `check()`, `eval()`, `plan()`, `task()` builders + registry
- `context/` — project/epic/task context types + APIs (`FileSystemAPI`, `ShellAPI` interfaces — implementations plug in)
- `ai/` — `createAIFactory`, `createProjectAI`, `AIContext`, `AIResponse` types
- `validation/` — task/project validators, rules
- `discovery/` — `DiscoveryScanner`, `DiscoveryWatcher` (if pure; if they touch fs, keep but document as I/O primitives)
- `metrics/` types — `BenchmarkResult` (extraction logic moved to engine)
- `shims/` — TS polyfills
- `schedule/` — scheduler type definitions (not the runtime logic — that's `@converge/scheduler`)
- `client/` — client wrappers if pure; otherwise evaluate
- **Executor type symbols** for swebench/tbench: `ExecutorFn`, `ExecutorContext`, `BenchmarkResult`

**Removed from core (moved to engine or deleted):**
- anything still importing `@converge/engine` (would have been caught in PR11c audit)
- anything creating stateful singletons
- anything with CLI-flavored side effects (`process.exit`, stdout writes, console logging)

**`packages/core/package.json` dependencies:**
- Keep: `zod`
- Remove: `@converge/display` (if still there from PR8 — move to cli's deps)
- Keep `@converge/journal`/`@converge/scheduler`/`@converge/navigator` IF core uses them at runtime; typically no — they're engine's concern
- If core is truly types-only, `dependencies` reduces to just `zod`

**Layering audits (REJECT on hit):**
```bash
# No CLI leakage
grep -rn "process\\.exit\\|process\\.stdout\\.write\\|process\\.stderr\\.write" packages/core/src && exit 1 || true
grep -rn "console\\.\\(log\\|error\\|warn\\|info\\)" packages/core/src | grep -v ".test.ts" && exit 1 || true

# No ANSI
grep -rnE "\\\\u001b\\[|\\\\x1b\\[" packages/core/src && exit 1 || true

# Core depends on no workspace packages (or only journal/scheduler/navigator if strictly needed)
grep -rn "@converge/" packages/core/src && exit 1 || true  # strict version; allow exceptions only if justified
```

**Verification that swebench/tbench still work:**
- `ExecutorFn`, `ExecutorContext`, `BenchmarkResult` are importable from `@converge/core`
- swebench + tbench tests green with no code changes beyond what PR11c already did

**Acceptance:**
- All layering audits clean
- `pnpm --filter @converge/core test` passes with minimal deps (zod only, ideally)
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/core/src` — no cycles
- Programmatic smoke preview: a script that imports `@converge/engine` and runs `autonomousRun` against a fixture works end-to-end

---

Runs the full pipeline: **analyze → implement → review → quality**.
