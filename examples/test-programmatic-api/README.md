# test-programmatic-api

Smoke-tests the programmatic surface of `@converge/core` end-to-end. No LLM calls, no CLI subprocess — just the public API:

- `definePlaybook` / `taskDef` — build a playbook in code
- `run(playbook, opts)` — execute it
- `writePlaybookToFolder` — serialize to disk
- `loadPlaybookFromFolder` — parse back to the same in-memory shape
- `captureReporter` — buffer `RunEvent`s for assertion
- `plan(opts)` — confirm the planner verb is callable (does not execute, since that would hit an LLM)

## What it verifies

This is the executable companion to [`docs/design/programmatic-core-and-planner.md`](../../docs/design/programmatic-core-and-planner.md). The doc says:

> Folder-based playbooks parse to the same `Playbook` / `TaskDefinition` objects code-defined ones produce. There is no folder-mode runtime vs. code-mode runtime — only one runtime that consumes the in-memory shape.

The script enforces that claim:

1. Build a 3-task playbook (`a → b → c`) with deterministic JS executors that each write a file.
2. Run it with `run(playbook, opts)` against this directory; assert the captured event sequence and final `RunResult`.
3. Serialize the same playbook with `writePlaybookToFolder`, then `loadPlaybookFromFolder` it back.
4. Run the reloaded playbook with `run(loaded, opts)`; assert the same shape.
5. Smoke-test `plan({ goal })` — confirm it's importable and the function signature matches.

## Run it

```bash
pnpm --filter @converge/core build  # ensure dist/ is fresh
node examples/test-programmatic-api/run.mjs
```

You should see something like:

```
[1/4] Defining a playbook in code…
       playbook: in-code-smoke (3 tasks)
[2/4] Running it via core.run()…
       events: 19 emitted
       result: 3 completed, 0 failed
[3/4] Round-tripping through writePlaybookToFolder + loadPlaybookFromFolder…
       wrote .converge/playbooks/round-trip/playbook.yml + tasks/
       reloaded: 3 tasks, deps preserved
[4/4] Confirming plan() is exported…
       typeof plan === "function" ✓

✅ All programmatic-API smoke checks passed.
```

## Why a separate example, not just a unit test?

The unit tests in `packages/core/tests/run.test.ts` cover the same surface, but they import from `../src` (TypeScript-source mode). This example imports from `dist/` — i.e., it confirms **the published bundle works**, not just the source. That's the contract real consumers (the planner app, third-party scripts) actually depend on.
