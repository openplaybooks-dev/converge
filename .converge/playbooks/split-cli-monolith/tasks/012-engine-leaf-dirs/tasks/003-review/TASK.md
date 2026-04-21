---
id: 003-review
title: "Review — PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)"
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs/review/report.md"
vars:
  taskId: 003-review
  parentId: 012-engine-leaf-dirs
  title: "PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)"
  tier: 4 — Engine middle layer
  task: "First engine slice: subdirs with no engine-to-engine cross-refs. Creates packages/engine/ skeleton and moves the easy ones."
  spec: "First slice of the engine extraction. Move subdirs that only depend on primitives (core, journal, scheduler, navigator) or on each other in this same list — no fanout into PR11b's orchestration hubs.\n\n**Create `packages/engine/`:**\n- `package.json` — name `@converge/engine`\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/index.ts` (barrel — grows over PR11a/b/c)\n\n**Deps:**\n- `@converge/core` (workspace:*)\n- `@converge/navigator` (workspace:*)\n- `@converge/journal` (workspace:*)\n- `@converge/scheduler` (workspace:*)\n\n**Source (git mv, in this PR):**\n- `packages/core/src/executor/` → `packages/engine/src/executor/`\n- `packages/core/src/planning/` → `packages/engine/src/planning/`\n- `packages/core/src/playbook/` → `packages/engine/src/playbook/`\n- `packages/core/src/unit/` → `packages/engine/src/unit/`\n- `packages/core/src/dispatch/` → `packages/engine/src/dispatch/`\n- `packages/core/src/agent-manager/` → `packages/engine/src/agent-manager/`\n- `packages/core/src/process/` → `packages/engine/src/process/`\n- `packages/core/src/resume/` → `packages/engine/src/resume/`\n- `packages/core/src/yields/` → `packages/engine/src/yields/`\n- `packages/core/src/subtasks/` → `packages/engine/src/subtasks/`\n- `packages/core/src/facts/` → `packages/engine/src/facts/`\n- `packages/core/src/artifacts/` → `packages/engine/src/artifacts/`\n- `packages/core/src/sidecar/` → `packages/engine/src/sidecar/`\n- `packages/core/src/scan/` → `packages/engine/src/scan/`\n- `packages/core/src/meta/` → `packages/engine/src/meta/`\n- `packages/core/src/runtime/` → `packages/engine/src/runtime/`\n- `packages/core/src/auto-verify/` → `packages/engine/src/auto-verify/`\n\n**Import rewrites (within engine, across the moved dirs):**\n- Intra-engine: `../executor/X` → `../executor/X` (paths stay relative within engine/src/)\n- To primitives: `../journal/X` → `@converge/journal`, `../scheduler/X` → `@converge/scheduler`, `../repair/navigator` → `@converge/navigator`\n- To remaining core dirs (gap, goal, config, etc.): keep as `@converge/core` for now (PR11b will finalize, PR12 slims core)\n\n**NOT in this PR (deferred to PR11b):** orchestrator, lifecycle, loop, converge, evolve, goal (evaluator), repair (sans navigator), plugins. These cross-reference PR11a entries and each other.\n\n**Acceptance:**\n- `packages/engine/src/` contains the 17 listed subdirs\n- Engine imports from `@converge/{core,navigator,journal,scheduler}` — no imports from cli, display\n- swebench + tbench tests green (public API still reaches `autonomousRun` via core's re-export — PR11c flips this)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/engine/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** First engine slice: subdirs with no engine-to-engine cross-refs. Creates packages/engine/ skeleton and moves the easy ones.
- **Full spec:**

First slice of the engine extraction. Move subdirs that only depend on primitives (core, journal, scheduler, navigator) or on each other in this same list — no fanout into PR11b's orchestration hubs.

**Create `packages/engine/`:**
- `package.json` — name `@converge/engine`
- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- `src/index.ts` (barrel — grows over PR11a/b/c)

**Deps:**
- `@converge/core` (workspace:*)
- `@converge/navigator` (workspace:*)
- `@converge/journal` (workspace:*)
- `@converge/scheduler` (workspace:*)

**Source (git mv, in this PR):**
- `packages/core/src/executor/` → `packages/engine/src/executor/`
- `packages/core/src/planning/` → `packages/engine/src/planning/`
- `packages/core/src/playbook/` → `packages/engine/src/playbook/`
- `packages/core/src/unit/` → `packages/engine/src/unit/`
- `packages/core/src/dispatch/` → `packages/engine/src/dispatch/`
- `packages/core/src/agent-manager/` → `packages/engine/src/agent-manager/`
- `packages/core/src/process/` → `packages/engine/src/process/`
- `packages/core/src/resume/` → `packages/engine/src/resume/`
- `packages/core/src/yields/` → `packages/engine/src/yields/`
- `packages/core/src/subtasks/` → `packages/engine/src/subtasks/`
- `packages/core/src/facts/` → `packages/engine/src/facts/`
- `packages/core/src/artifacts/` → `packages/engine/src/artifacts/`
- `packages/core/src/sidecar/` → `packages/engine/src/sidecar/`
- `packages/core/src/scan/` → `packages/engine/src/scan/`
- `packages/core/src/meta/` → `packages/engine/src/meta/`
- `packages/core/src/runtime/` → `packages/engine/src/runtime/`
- `packages/core/src/auto-verify/` → `packages/engine/src/auto-verify/`

**Import rewrites (within engine, across the moved dirs):**
- Intra-engine: `../executor/X` → `../executor/X` (paths stay relative within engine/src/)
- To primitives: `../journal/X` → `@converge/journal`, `../scheduler/X` → `@converge/scheduler`, `../repair/navigator` → `@converge/navigator`
- To remaining core dirs (gap, goal, config, etc.): keep as `@converge/core` for now (PR11b will finalize, PR12 slims core)

**NOT in this PR (deferred to PR11b):** orchestrator, lifecycle, loop, converge, evolve, goal (evaluator), repair (sans navigator), plugins. These cross-reference PR11a entries and each other.

**Acceptance:**
- `packages/engine/src/` contains the 17 listed subdirs
- Engine imports from `@converge/{core,navigator,journal,scheduler}` — no imports from cli, display
- swebench + tbench tests green (public API still reaches `autonomousRun` via core's re-export — PR11c flips this)
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/engine/src` — no cycles

- Analysis: `D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs/implement/plan.md`

## Review criteria

1. **Alignment** — does the diff match the spec? Files named in the spec should be the only files changed (plus strictly required import updates). If scope drifted, **REJECT**.
2. **Acceptance criteria** — every bullet in the spec's Acceptance block must be satisfied. If not, REJECT.
3. **Behavior-locking tests (PR1)** — still green? If a move/split broke them, the split is wrong, REJECT.
4. **No shims** — the user explicitly chose hard breaks for public exports (PR4, PR13). If a re-export shim was added "for safety", REJECT.
5. **Line limits** — for split PRs (3, 5, 6, 9), every new file ≤500 lines. If any file is larger, REJECT.
6. **Layering (CRITICAL for Tier B, PR10–PR13)** — `@converge/core` is the programmatic interface; `@converge/cli` is the terminal-facing shell; a future web UI must be able to integrate directly with `core` without touching `cli` or `display`. Run these audits and **REJECT** on any hit:
   - `grep -rn "@converge/display\|@converge/cli" packages/core/src` → no matches (core never imports CLI-layer packages)
   - `grep -n "@converge/display\|@converge/cli" packages/core/package.json` → no matches
   - `grep -rn "process\.exit\|process\.stdout\.write\|process\.stderr\.write" packages/core/src` → no matches
   - `grep -rn "console\.\(log\|error\|warn\|info\)" packages/core/src | grep -v ".test.ts"` → no matches
   - `grep -rn "@converge/display" packages/scheduler/src packages/journal/src 2>/dev/null` → no matches
7. **Style** — matches existing codebase conventions.

## Steps

1. `git diff --stat` — confirm only spec-scoped files changed.
2. `git diff` — read the full diff.
3. Re-run `pnpm test` to confirm green.
4. Compare diff against each Acceptance bullet.

## Output

Write `D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
