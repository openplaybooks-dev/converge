---
id: 011-extract-scheduler-pkg
title: "PR10 — Extract @converge/scheduler workspace package"
blocking: true
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js"
vars:
  taskId: 011-extract-scheduler-pkg
  title: "PR10 — Extract @converge/scheduler workspace package"
  tier: 3 — Leaf primitives
  task: Directory-level git mv of packages/core/src/scheduler/ (from PR4) into packages/scheduler/. Plus ensure-epic-checkpoints.ts. Clean extraction.
  spec: "Create `packages/scheduler/` workspace package. Because PR4 put `scheduler/*` in its final shape already, this PR is a directory-level `git mv` with zero reshuffle.\n\n**Source (git mv):**\n- `packages/core/src/scheduler/*` → `packages/scheduler/src/*`\n- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` → `packages/scheduler/src/ensure-epic-checkpoints.ts`\n\n**Deps:**\n- `@converge/journal` (workspace:*) — for `CheckpointManager`, `constructJournalPath`\n- `@converge/core` (workspace:*) — for shared types (post-PR12 slim core)\n\n**Exports:**\n- `findNextTask`, `buildTaskTree`, `getTaskStates`, `calculateExecutionPlan`\n- `ensureEpicCheckpoints`\n- Types: `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult`\n\n**Core side:**\n- `packages/core/package.json` adds `\"@converge/scheduler\": \"workspace:*\"`\n- Update import sites: `../scheduler/X` → `@converge/scheduler`\n- `packages/core/src/scheduler/` directory deleted\n- `packages/core/src/checkpoint/` directory deleted (empty post-ensure-epic-checkpoints move)\n\n**Layering audit:**\n```bash\n# Scheduler depends only on journal + core types\ngrep -rn \"@converge/\" packages/scheduler/src | grep -vE \"@converge/(journal|core)\" && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 scheduler suites still pass (imports re-resolve to `@converge/scheduler`)\n- swebench + tbench tests green\n- `@converge/scheduler` tests pass in isolation\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/scheduler/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg"
  itemTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js\""
---

# PR10 — Extract @converge/scheduler workspace package

**Tier:** 3 — Leaf primitives

**Summary:** Directory-level git mv of packages/core/src/scheduler/ (from PR4) into packages/scheduler/. Plus ensure-epic-checkpoints.ts. Clean extraction.

## Full specification

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

---

Runs the full pipeline: **analyze → implement → review → quality**.
