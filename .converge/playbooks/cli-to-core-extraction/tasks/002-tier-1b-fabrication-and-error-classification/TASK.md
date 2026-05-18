---
id: tier-1b
title: "Tier 1b — Move fabrication-scanner and error-classification into core"
blocking: true
checks:
  - id: core-builds
    cmd: "pnpm -F @openplaybooks/converge-core build 2>&1 | tail -3"
    description: "@openplaybooks/converge-core compiles"
  - id: cli-builds
    cmd: "pnpm -F @openplaybooks/converge build 2>&1 | tail -3"
    description: "@openplaybooks/converge compiles against new core"
  - id: cli-smoke
    cmd: "node packages/cli/dist/index.js --help >/dev/null 2>&1"
    description: "converge --help runs"
  - id: run-smoke
    cmd: "cd examples/game-assets-video && pnpm exec converge run --max-iterations 1 --dry >/dev/null 2>&1"
    description: "converge run --dry exercises both moved modules without crashing"
  - id: fabrication-moved
    cmd: "test -f packages/core/src/runner/fabrication-scanner.ts && ! test -f packages/cli/src/fabrication-scanner.ts"
    description: "fabrication-scanner moved to core; CLI source deleted"
  - id: error-classification-moved
    cmd: "test -f packages/core/src/runner/error-classification.ts && ! test -f packages/cli/src/error-classification.ts"
    description: "error-classification moved to core; CLI source deleted"
  - id: no-console-in-moved
    cmd: "test -z \"$(grep -n 'console\\.' packages/core/src/runner/fabrication-scanner.ts packages/core/src/runner/error-classification.ts 2>/dev/null)\""
    description: "Moved files use logger, not console.*"
  - id: autonomous-run-imports-from-core
    cmd: "grep -q '@openplaybooks/converge-core' packages/cli/src/autonomous-run.ts && ! grep -q \"from ['\\\"]\\\\./fabrication-scanner\" packages/cli/src/autonomous-run.ts && ! grep -q \"from ['\\\"]\\\\./error-classification\" packages/cli/src/autonomous-run.ts"
    description: "autonomous-run.ts (still in CLI) imports the two modules from core, not from CLI siblings"
---

# Tier 1b — Move fabrication-scanner and error-classification into core

**Summary:** Move two leaf modules that `autonomous-run.ts` lazy-imports at runtime: `fabrication-scanner.ts` (overrides exec result success → failure when fabrications detected) and `error-classification.ts` (transient vs structural failure classification driving retry budget). Both are pure domain logic.

## What to do

### Files to move

| Source (CLI)                                  | Destination (core)                                  |
|-----------------------------------------------|-----------------------------------------------------|
| `packages/cli/src/fabrication-scanner.ts`     | `packages/core/src/runner/fabrication-scanner.ts`   |
| `packages/cli/src/error-classification.ts`    | `packages/core/src/runner/error-classification.ts`  |

### Why these two move together

`autonomous-run.ts` (which moves in Tier 1d) does `await import("./fabrication-scanner.ts")` and `await import("./error-classification.ts")` at runtime. Once `autonomous-run.ts` lives in core, those lazy CLI-relative imports break. These two files must be in core before Tier 1d can land.

Neither file has any current dependents in CLI besides `autonomous-run.ts`. Verify with:
```sh
grep -rn "from.*fabrication-scanner\|from.*error-classification" packages/cli/src
```
If the only matches are inside `autonomous-run.ts`, this tier is safe.

### Required transforms inside the moved files

Read each file fully first. Then for each:
- Update relative imports of `@openplaybooks/converge-core/...` paths to be relative-to-the-new-location.
- Replace any `console.*` calls with calls on a passed-in `logger: Logger` (signature change). If a function previously took no logger, add an optional `logger?: Logger` last parameter.
- No `process.exit` or signal-handler code expected; verify with grep.
- No `chalk` expected; verify with grep.

### CLI-side updates

- Delete `packages/cli/src/fabrication-scanner.ts` and `packages/cli/src/error-classification.ts`.
- `packages/cli/src/autonomous-run.ts` — change the two lazy `import("./fabrication-scanner.ts")` and `import("./error-classification.ts")` calls to import from `@openplaybooks/converge-core/runner/fabrication-scanner.js` and `@openplaybooks/converge-core/runner/error-classification.js`. (These are still lazy imports at this tier — they become eager when autonomous-run itself moves to core in Tier 1d.)
- If anything else in CLI imports either file, update those too.

### Public API

Add to `packages/core/src/index.ts`:
```ts
export { /* whatever the public symbols are */ } from "./runner/fabrication-scanner.ts";
export { /* whatever the public symbols are */ } from "./runner/error-classification.ts";
```
Read each file first to determine the exact public symbol list — these weren't deeply explored in the original plan.

### Manual verification (not in `checks:`, do this last)

`cd examples/game-assets-video && pnpm exec converge run --max-iterations 1` — must run end-to-end. Both files are exercised on every task execution (fabrication-scanner in `stateCommit`, error-classification on any task failure), so this is the real integration test.
