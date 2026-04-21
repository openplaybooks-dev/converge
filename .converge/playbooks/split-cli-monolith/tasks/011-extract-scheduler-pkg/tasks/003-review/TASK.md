---
id: 003-review
title: "Review — PR10 — Extract @converge/scheduler workspace package"
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg/review/report.md"
vars:
  taskId: 003-review
  parentId: 011-extract-scheduler-pkg
  title: "PR10 — Extract @converge/scheduler workspace package"
  tier: 3 — Leaf primitives
  task: Directory-level git mv of packages/core/src/scheduler/ (from PR4) into packages/scheduler/. Plus ensure-epic-checkpoints.ts. Clean extraction.
  spec: "Create `packages/scheduler/` workspace package. Because PR4 put `scheduler/*` in its final shape already, this PR is a directory-level `git mv` with zero reshuffle.\n\n**Source (git mv):**\n- `packages/core/src/scheduler/*` → `packages/scheduler/src/*`\n- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` → `packages/scheduler/src/ensure-epic-checkpoints.ts`\n\n**Deps:**\n- `@converge/journal` (workspace:*) — for `CheckpointManager`, `constructJournalPath`\n- `@converge/core` (workspace:*) — for shared types (post-PR12 slim core)\n\n**Exports:**\n- `findNextTask`, `buildTaskTree`, `getTaskStates`, `calculateExecutionPlan`\n- `ensureEpicCheckpoints`\n- Types: `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult`\n\n**Core side:**\n- `packages/core/package.json` adds `\"@converge/scheduler\": \"workspace:*\"`\n- Update import sites: `../scheduler/X` → `@converge/scheduler`\n- `packages/core/src/scheduler/` directory deleted\n- `packages/core/src/checkpoint/` directory deleted (empty post-ensure-epic-checkpoints move)\n\n**Layering audit:**\n```bash\n# Scheduler depends only on journal + core types\ngrep -rn \"@converge/\" packages/scheduler/src | grep -vE \"@converge/(journal|core)\" && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 scheduler suites still pass (imports re-resolve to `@converge/scheduler`)\n- swebench + tbench tests green\n- `@converge/scheduler` tests pass in isolation\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/scheduler/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR10 — Extract @converge/scheduler workspace package

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Directory-level git mv of packages/core/src/scheduler/ (from PR4) into packages/scheduler/. Plus ensure-epic-checkpoints.ts. Clean extraction.
- **Full spec:**

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

- Analysis: `D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg/implement/plan.md`

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

Write `D:/converge/.converge/artifacts/split-cli/011-extract-scheduler-pkg/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
