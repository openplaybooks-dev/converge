# Epoch 1 — Fix type narrowing in dispatch-runner

## What changed
Fixed a type error in `packages/core/src/dispatch/dispatch-runner.ts` at line 84 where `ref.vars` (a union type) was passed directly to `copyWithSubstitution` which expects `Record<string, string>`. The fix extracts `ref.vars` into a local const to enable TypeScript type narrowing.

## Files modified
- `packages/core/src/dispatch/dispatch-runner.ts` — extracted `ref.vars` into a local const before calling `copyWithSubstitution`, fixing the type error

## What was considered but skipped
- claudefn logDir regression — 28 failing tests due to `logDir` becoming a required parameter; larger breaking change requiring test fixture updates and API review
- kimifn skills.test.ts import failure — missing `agentfn` package, affects 1 test suite; separate issue unrelated to typecheck convergence