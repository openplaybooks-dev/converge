# Analysis — Epoch 1

## Health snapshot
- Type errors: 1 (packages/core/src/dispatch/dispatch-runner.ts:84)
- Tests: codets 283 passed; claudefn 28 failed / 72 passed; geminifn 29 passed; kimifn 96 passed (acpfn has no test files)

## Picked improvement
- **Area:** packages/core/src/dispatch/dispatch-runner.ts — type error
- **Description:** Fix the type error at line 84 where `ref.vars` (type `string | Record<string, string>`) is passed to `copyWithSubstitution` which expects `Record<string, string>`. The `SpawnRef` interface defines `vars: Record<string, string>`, but TypeScript still sees the union `SpawnRef | Record<string, string>` where the second branch could be a `string`. The fix is to narrow the type via a runtime check or split the union branches.
- **Rationale:** This is the only thing blocking `pnpm typecheck` from passing. It is a simple type narrowing issue with a clear fix. Resolving it unblocks the full typecheck pass.

## Candidates considered
- claudefn logDir regression — 28 failing tests because `logDir is required` was added as a mandatory parameter. This is a larger breaking change requiring test fixture updates and API review. Lower priority than the single-file type fix.
- kimifn skills.test.ts import failure — missing `agentfn` package, affects 1 test suite. Separate issue unrelated to typecheck/test convergence.