---
id: 001-analyze
title: "Analyze — PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)"
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 012-engine-leaf-dirs
  title: "PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)"
  tier: 4 — Engine middle layer
  task: "First engine slice: subdirs with no engine-to-engine cross-refs. Creates packages/engine/ skeleton and moves the easy ones."
  spec: "First slice of the engine extraction. Move subdirs that only depend on primitives (core, journal, scheduler, navigator) or on each other in this same list — no fanout into PR11b's orchestration hubs.\n\n**Create `packages/engine/`:**\n- `package.json` — name `@converge/engine`\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/index.ts` (barrel — grows over PR11a/b/c)\n\n**Deps:**\n- `@converge/core` (workspace:*)\n- `@converge/navigator` (workspace:*)\n- `@converge/journal` (workspace:*)\n- `@converge/scheduler` (workspace:*)\n\n**Source (git mv, in this PR):**\n- `packages/core/src/executor/` → `packages/engine/src/executor/`\n- `packages/core/src/planning/` → `packages/engine/src/planning/`\n- `packages/core/src/playbook/` → `packages/engine/src/playbook/`\n- `packages/core/src/unit/` → `packages/engine/src/unit/`\n- `packages/core/src/dispatch/` → `packages/engine/src/dispatch/`\n- `packages/core/src/agent-manager/` → `packages/engine/src/agent-manager/`\n- `packages/core/src/process/` → `packages/engine/src/process/`\n- `packages/core/src/resume/` → `packages/engine/src/resume/`\n- `packages/core/src/yields/` → `packages/engine/src/yields/`\n- `packages/core/src/subtasks/` → `packages/engine/src/subtasks/`\n- `packages/core/src/facts/` → `packages/engine/src/facts/`\n- `packages/core/src/artifacts/` → `packages/engine/src/artifacts/`\n- `packages/core/src/sidecar/` → `packages/engine/src/sidecar/`\n- `packages/core/src/scan/` → `packages/engine/src/scan/`\n- `packages/core/src/meta/` → `packages/engine/src/meta/`\n- `packages/core/src/runtime/` → `packages/engine/src/runtime/`\n- `packages/core/src/auto-verify/` → `packages/engine/src/auto-verify/`\n\n**Import rewrites (within engine, across the moved dirs):**\n- Intra-engine: `../executor/X` → `../executor/X` (paths stay relative within engine/src/)\n- To primitives: `../journal/X` → `@converge/journal`, `../scheduler/X` → `@converge/scheduler`, `../repair/navigator` → `@converge/navigator`\n- To remaining core dirs (gap, goal, config, etc.): keep as `@converge/core` for now (PR11b will finalize, PR12 slims core)\n\n**NOT in this PR (deferred to PR11b):** orchestrator, lifecycle, loop, converge, evolve, goal (evaluator), repair (sans navigator), plugins. These cross-reference PR11a entries and each other.\n\n**Acceptance:**\n- `packages/engine/src/` contains the 17 listed subdirs\n- Engine imports from `@converge/{core,navigator,journal,scheduler}` — no imports from cli, display\n- swebench + tbench tests green (public API still reaches `autonomousRun` via core's re-export — PR11c flips this)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/engine/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout)

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** First engine slice: subdirs with no engine-to-engine cross-refs. Creates packages/engine/ skeleton and moves the easy ones.

**Full spec:**

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

## Steps

1. **Read the spec** above carefully — it names exact file paths, line ranges, and acceptance criteria.
2. **Inspect current state:**
   - Read every file path named in the spec; note its current size, exports, imports.
   - Run `grep -rn "from.*<module>" packages/core/src` to enumerate real import sites — the spec's numbers are estimates, the grep is truth.
   - Check `git log --oneline -- <path>` for recent churn that might complicate the move.
3. **Identify risks:**
   - Cyclic imports introduced by the split
   - Public API paths that downstream packages (swebench, tbench) import from
   - Line-range drift since the spec was written — symbols may have moved
4. **Write the plan.**

## Output

Write `D:/converge/.converge/artifacts/split-cli/012-engine-leaf-dirs/analyze/plan.md`:

```markdown
# PR11a — Extract @converge/engine: leaf dirs (no engine-to-engine fanout) — Analysis

## Source audit
- <file>: <current lines>, <exports>, <consumers found via grep>

## Implementation plan
1. Step — what to do and why
2. Step — ...

## Risks & mitigations
- <risk>: <mitigation>

## Acceptance checklist (copy from spec)
- [ ] <criterion>
- [ ] <criterion>
```
