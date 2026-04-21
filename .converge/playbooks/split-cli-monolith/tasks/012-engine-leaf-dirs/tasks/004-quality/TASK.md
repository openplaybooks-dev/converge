---
id: 004-quality
title: "Quality gate — PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)"
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
  parentId: 012-engine-leaf-dirs
  title: "PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)"
  tier: 4 — Engine middle layer
  task: "First engine slice: subdirs with no engine-to-engine cross-refs. Creates packages/engine/ skeleton and moves the easy ones."
  spec: "First slice of the engine extraction. Move subdirs that only depend on primitives (core, journal, scheduler, navigator) or on each other in this same list — no fanout into PR11b's orchestration hubs.\n\n**Create `packages/engine/`:**\n- `package.json` — name `@converge/engine`\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/index.ts` (barrel — grows over PR11a/b/c)\n\n**Deps:**\n- `@converge/core` (workspace:*)\n- `@converge/navigator` (workspace:*)\n- `@converge/journal` (workspace:*)\n- `@converge/scheduler` (workspace:*)\n\n**Source (git mv, in this PR):**\n- `packages/core/src/executor/` → `packages/engine/src/executor/`\n- `packages/core/src/planning/` → `packages/engine/src/planning/`\n- `packages/core/src/playbook/` → `packages/engine/src/playbook/`\n- `packages/core/src/unit/` → `packages/engine/src/unit/`\n- `packages/core/src/dispatch/` → `packages/engine/src/dispatch/`\n- `packages/core/src/agent-manager/` → `packages/engine/src/agent-manager/`\n- `packages/core/src/process/` → `packages/engine/src/process/`\n- `packages/core/src/resume/` → `packages/engine/src/resume/`\n- `packages/core/src/yields/` → `packages/engine/src/yields/`\n- `packages/core/src/subtasks/` → `packages/engine/src/subtasks/`\n- `packages/core/src/facts/` → `packages/engine/src/facts/`\n- `packages/core/src/artifacts/` → `packages/engine/src/artifacts/`\n- `packages/core/src/sidecar/` → `packages/engine/src/sidecar/`\n- `packages/core/src/scan/` → `packages/engine/src/scan/`\n- `packages/core/src/meta/` → `packages/engine/src/meta/`\n- `packages/core/src/runtime/` → `packages/engine/src/runtime/`\n- `packages/core/src/auto-verify/` → `packages/engine/src/auto-verify/`\n\n**Import rewrites (within engine, across the moved dirs):**\n- Intra-engine: `../executor/X` → `../executor/X` (paths stay relative within engine/src/)\n- To primitives: `../journal/X` → `@converge/journal`, `../scheduler/X` → `@converge/scheduler`, `../repair/navigator` → `@converge/navigator`\n- To remaining core dirs (gap, goal, config, etc.): keep as `@converge/core` for now (PR11b will finalize, PR12 slims core)\n\n**NOT in this PR (deferred to PR11b):** orchestrator, lifecycle, loop, converge, evolve, goal (evaluator), repair (sans navigator), plugins. These cross-reference PR11a entries and each other.\n\n**Acceptance:**\n- `packages/engine/src/` contains the 17 listed subdirs\n- Engine imports from `@converge/{core,navigator,journal,scheduler}` — no imports from cli, display\n- swebench + tbench tests green (public API still reaches `autonomousRun` via core's re-export — PR11c flips this)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/engine/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
