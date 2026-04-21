---
id: 004-quality
title: "Quality gate — PR10 — Extract @converge/scheduler workspace package"
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
  parentId: 011-extract-scheduler-pkg
  title: "PR10 — Extract @converge/scheduler workspace package"
  tier: 3 — Leaf primitives
  task: Directory-level git mv of packages/core/src/scheduler/ (from PR4) into packages/scheduler/. Plus ensure-epic-checkpoints.ts. Clean extraction.
  spec: "Create `packages/scheduler/` workspace package. Because PR4 put `scheduler/*` in its final shape already, this PR is a directory-level `git mv` with zero reshuffle.\n\n**Source (git mv):**\n- `packages/core/src/scheduler/*` → `packages/scheduler/src/*`\n- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` → `packages/scheduler/src/ensure-epic-checkpoints.ts`\n\n**Deps:**\n- `@converge/journal` (workspace:*) — for `CheckpointManager`, `constructJournalPath`\n- `@converge/core` (workspace:*) — for shared types (post-PR12 slim core)\n\n**Exports:**\n- `findNextTask`, `buildTaskTree`, `getTaskStates`, `calculateExecutionPlan`\n- `ensureEpicCheckpoints`\n- Types: `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult`\n\n**Core side:**\n- `packages/core/package.json` adds `\"@converge/scheduler\": \"workspace:*\"`\n- Update import sites: `../scheduler/X` → `@converge/scheduler`\n- `packages/core/src/scheduler/` directory deleted\n- `packages/core/src/checkpoint/` directory deleted (empty post-ensure-epic-checkpoints move)\n\n**Layering audit:**\n```bash\n# Scheduler depends only on journal + core types\ngrep -rn \"@converge/\" packages/scheduler/src | grep -vE \"@converge/(journal|core)\" && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 scheduler suites still pass (imports re-resolve to `@converge/scheduler`)\n- swebench + tbench tests green\n- `@converge/scheduler` tests pass in isolation\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/scheduler/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR10 — Extract @converge/scheduler workspace package

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
