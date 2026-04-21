---
id: 001-execute
title: "Execute: Core keeps only pure types/contracts: gap, goal/types, config, hooks, functions, context, ai, validation, discovery, metrics types, shims, executor types for swebench/tbench."
---

Implement the PR.

**Summary:** Core keeps only pure types/contracts: gap, goal/types, config, hooks, functions, context, ai, validation, discovery, metrics types, shims, executor types for swebench/tbench.

**Spec:**
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

**Analysis:** `D:/converge/.converge/artifacts/split-cli/015-slim-core/analyze/plan.md`
