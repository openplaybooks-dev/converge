---
id: 001-execute
title: "Execute: Directory-level git mv of packages/core/src/scheduler/ (from PR4) into packages/scheduler/. Plus ensure-epic-checkpoints.ts. Clean extraction."
---

Implement the PR.

**Summary:** Directory-level git mv of packages/core/src/scheduler/ (from PR4) into packages/scheduler/. Plus ensure-epic-checkpoints.ts. Clean extraction.

**Spec:**
Create `packages/scheduler/` workspace package. Because PR4 put `scheduler/*` in its final shape already, this PR is a directory-level `git mv` with zero reshuffle.

**Source (git mv):**
- `packages/core/src/scheduler/*` → `packages/scheduler/src/*`
- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` → `packages/scheduler/src/ensure-epic-checkpoints.ts`

**Deps:**
- `@converge/journal` (workspace:*) — for `CheckpointManager`, `constructJournalPath`
- `@converge/core` (workspace:*) — for shared types (post-PR12 slim core)

**Exports:**
- `findNextTask`, `buildTaskTree`, `getTaskStates`, `calculateExecutionPlan`
- `ensureEpicCheckpoints`
- Types: `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult`

**Core side:**
- `packages/core/package.json` adds `"@converge/scheduler": "workspace:*"`
- Update import sites: `../scheduler/X` → `@converge/scheduler`
- `packages/core/src/scheduler/` directory deleted
- `packages/core/src/checkpoint/` directory deleted (empty post-ensure-epic-checkpoints move)

**Layering audit:**
```bash
# Scheduler depends only on journal + core types
grep -rn "@converge/" packages/scheduler/src | grep -vE "@converge/(journal|core)" && exit 1 || true
```

**Acceptance:**
- PR1 scheduler suites still pass (imports re-resolve to `@converge/scheduler`)
- swebench + tbench tests green
- `@converge/scheduler` tests pass in isolation
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/scheduler/src` — no cycles

**Analysis:** `D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg/analyze/plan.md`
