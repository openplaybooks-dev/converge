# cli-to-core-extraction

One-off playbook that extracts orchestration logic from `packages/cli` into `packages/core` so that `@converge/core` exposes a real programmatic API. After this playbook lands, external callers (Studio, language bindings, embeddings, tests) can drive converge without invoking the CLI.

The full plan lives at `/Users/minh/.claude/plans/review-the-package-cli-lazy-sedgewick.md`.

## Goal

- `@converge/core` becomes the source of truth for converge's runtime.
- `runAutonomous()` and `runPlaybook()` are exported from core; they accept a `Logger`, an `AbortSignal`, and an optional event emitter.
- `@converge/cli` becomes a thin UI shell: arg parsing, output formatting, prompts, exit-code translation.
- No behavior change. No new features. No rewrite. Move-and-expose only.

## Approach

Tiered extraction. Each sub-tier is independently mergeable and ships as one PR.

**Tier 1a** — `playbook-lock.ts` + `reconcile.ts` → core (small, low-risk warmup)
**Tier 1b** — `fabrication-scanner.ts` + `error-classification.ts` → core (leaf modules lazy-imported by autonomous-run)
**Tier 1c** — `next-task.ts` → `core/planning/task-selection.ts` (rename `findNextTask` → `findNextIncompleteTask` to avoid collision with `TaskTree.findNextTask`)
**Tier 1d** — `autonomous-run.ts` → `core/runner/autonomous.ts` (the heart of converge — depends on 1a–1c)

Tier 2 (`runPlaybook` facade extracted from `main.ts`) is **out of scope** for this playbook. It requires first refactoring `setPlaybookScope` from env-var mutation to parameter-passed scope, which is its own piece of work. Land Tier 1 first; queue Tier 2 in a follow-up.

## Per-tier shape

Each tier is **one self-contained task** — no analyze/implement/review/quality decomposition. The runner reads the tier's `TASK.md`, does the move, and the `checks:` block in frontmatter proves it's done. The runner is the analyzer; the spec is the brief.

Each tier's `TASK.md` includes:
- A summary
- The list of files to move
- Required transforms inside the moved files (logger swap, `process.exit` removal, etc.)
- CLI-side updates (which import sites to fix, which files to delete)
- The new public-API exports
- A `checks:` block that gates completion (typecheck, build, CLI smoke, hygiene-grep gates, file-existence assertions)
- A short **Manual verification** section for things that can't easily be a check (e.g., lock contention smoke test in two shells, before/after `converge tree` output comparison)

## Per-tier specs

See `wbs/tiers.json` for full specs. Summary:

| Tier | Files moved (CLI → core)                                                           | Key transforms                                                                                |
| ---- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1a   | `playbook-lock.ts` → `core/locks/playbook.ts`<br>`reconcile.ts` → `core/checkpoint/reconcile.ts` | Strip signal handlers (return `LockHandle`); replace `process.exit` with thrown error; `console.*` → logger |
| 1b   | `fabrication-scanner.ts` → `core/runner/fabrication-scanner.ts`<br>`error-classification.ts` → `core/runner/error-classification.ts` | Update imports; `console.*` → logger if present                                               |
| 1c   | `next-task.ts` → `core/planning/task-selection.ts`                                 | Rename exported `findNextTask` → `findNextIncompleteTask`; replace `require('node:fs')` with ESM import; `CONVERGE_DEBUG_DEPS` env reads → `logger.debug` |
| 1d   | `autonomous-run.ts` → `core/runner/autonomous.ts`                                  | Replace 60+ `console.*` calls with logger; replace 5 `process.exit` calls with throws/returns; remove `(global as any).__CONVERGE_*__`; replace lazy `import("./run-event-stream.ts")` with typed `RunEventEmitter` injected via `runAutonomous(opts)`; `core/runner/events.ts` defines the event types |

## Verification (covered by the playbook's `checks`)

After every tier:

- `pnpm -F @converge/core build`, `pnpm -F @converge/cli build` — both compile.
- `cd examples/game-assets-video && pnpm exec converge tree` — task tree renders identically.
- The hygiene greps in `playbook.yml` return zero matches.

After Tier 1d:

- Programmatic smoke test from a fresh dir with only `@converge/core` installed:
  ```ts
  import { runAutonomous, loadConvergeConfig } from "@converge/core";
  const cfg = await loadConvergeConfig(projectDir);
  const r = await runAutonomous({ projectDir, convergeConfig: cfg, maxIterations: 1 });
  console.log(r);
  ```
  Must succeed without `@converge/cli` on the dependency tree. **This is the core test of the refactor's success.**

## Out of scope

- Tier 2 (`runPlaybook` facade) — separate playbook.
- Tier 3 (validate/reset/migrate command business logic into core) — defer.
- Implementing the stubbed `Runtime.run()` and `ProjectOrchestratorV2.run()` — they stay throwing.
- New features beyond the move (richer cancellation, progress callbacks beyond the events emitter).

## Usage

```bash
converge run --playbook=cli-to-core-extraction
```

Resume-safe. Each tier lands its own PR.

## Structure

Flat. One task per tier. No dynamic WBS, no JS, no JSON, no nested phases.

```
cli-to-core-extraction/
  playbook.yml                                              # mode: oneoff, 4h max
  README.md                                                 # this file
  TASK.md                                                   # root task
  tasks/
    001-tier-1a-lock-and-reconcile/TASK.md                  # spec + checks: block
    002-tier-1b-fabrication-and-error-classification/TASK.md
    003-tier-1c-task-selection/TASK.md
    004-tier-1d-autonomous-runner/TASK.md
```

5 markdown files total. To change the work, edit the relevant tier's `TASK.md`.
