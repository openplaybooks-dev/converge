---
id: 003-review
title: "Review — PR9 — Extract @converge/journal workspace package"
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg/review/report.md"
vars:
  taskId: 003-review
  parentId: 010-extract-journal-pkg
  title: "PR9 — Extract @converge/journal workspace package"
  tier: 3 — Leaf primitives
  task: "Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator."
  spec: "Create `packages/journal/` workspace package. High import churn (~40 sites).\n\n**Source (git mv):**\n- `packages/core/src/journal/*` → `packages/journal/src/journal/`\n- `packages/core/src/checkpoint/*` → `packages/journal/src/checkpoint/`\n- `packages/core/src/storage/*` → `packages/journal/src/storage/`\n\n**Rename (IMPORTANT):**\n- `journal/navigator.ts` (journal-side reader) → `journal/navigator-reader.ts`\n\nReason: `@converge/navigator` (PR3b) and `journal/navigator.ts` will otherwise be confusable in grep, IDE search, and stack traces. Rename to `navigator-reader.ts` before extraction so the name collision never exists in the new package.\n\n**Deps:** `zod` only.\n\n**Exports:**\n- `CheckpointManager`, `TaskCheckpointManager`, `UnitCheckpointManager`\n- `SessionLogger`\n- `FilesystemStorage`\n- `constructJournalPath`\n- `JournalCleanup`\n- (navigator-reader stays internal unless a consumer needs it)\n\n**Caveat — ensure-epic-checkpoints.ts:**\n\n`packages/core/src/checkpoint/ensure-epic-checkpoints.ts` imports from `scheduler/` (post-PR4). Moving it into `@converge/journal` would create a journal → scheduler dep, which inverts the onion (journal is more primitive than scheduler). \n\n**Resolution:** leave `ensure-epic-checkpoints.ts` in `packages/core/src/scheduler/` (not in this PR's move). PR10 moves it to `@converge/scheduler` along with the rest of scheduler.\n\n**Codemod for imports:**\n\n~40 sites import from journal/checkpoint/storage. Use `sed -i` or ts-morph to rewrite:\n- `../journal/X` → `@converge/journal` (for internal paths, pick the barrel export)\n- `../checkpoint/X` → `@converge/journal`\n- `../storage/X` → `@converge/journal`\n\nFind them: `grep -rln \"from.*['\\\"]\\\\.\\\\.*/(journal|checkpoint|storage)/\" packages/core/src`\n\n**Acceptance:**\n- `journal/navigator.ts` no longer exists; `journal/navigator-reader.ts` does\n- swebench + tbench tests green\n- `@converge/journal` tests pass in isolation\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/journal/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR9 — Extract @converge/journal workspace package

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator.
- **Full spec:**

Create `packages/journal/` workspace package. High import churn (~40 sites).

**Source (git mv):**
- `packages/core/src/journal/*` → `packages/journal/src/journal/`
- `packages/core/src/checkpoint/*` → `packages/journal/src/checkpoint/`
- `packages/core/src/storage/*` → `packages/journal/src/storage/`

**Rename (IMPORTANT):**
- `journal/navigator.ts` (journal-side reader) → `journal/navigator-reader.ts`

Reason: `@converge/navigator` (PR3b) and `journal/navigator.ts` will otherwise be confusable in grep, IDE search, and stack traces. Rename to `navigator-reader.ts` before extraction so the name collision never exists in the new package.

**Deps:** `zod` only.

**Exports:**
- `CheckpointManager`, `TaskCheckpointManager`, `UnitCheckpointManager`
- `SessionLogger`
- `FilesystemStorage`
- `constructJournalPath`
- `JournalCleanup`
- (navigator-reader stays internal unless a consumer needs it)

**Caveat — ensure-epic-checkpoints.ts:**

`packages/core/src/checkpoint/ensure-epic-checkpoints.ts` imports from `scheduler/` (post-PR4). Moving it into `@converge/journal` would create a journal → scheduler dep, which inverts the onion (journal is more primitive than scheduler). 

**Resolution:** leave `ensure-epic-checkpoints.ts` in `packages/core/src/scheduler/` (not in this PR's move). PR10 moves it to `@converge/scheduler` along with the rest of scheduler.

**Codemod for imports:**

~40 sites import from journal/checkpoint/storage. Use `sed -i` or ts-morph to rewrite:
- `../journal/X` → `@converge/journal` (for internal paths, pick the barrel export)
- `../checkpoint/X` → `@converge/journal`
- `../storage/X` → `@converge/journal`

Find them: `grep -rln "from.*['\"]\\.\\.*/(journal|checkpoint|storage)/" packages/core/src`

**Acceptance:**
- `journal/navigator.ts` no longer exists; `journal/navigator-reader.ts` does
- swebench + tbench tests green
- `@converge/journal` tests pass in isolation
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/journal/src` — no cycles

- Analysis: `D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg/implement/plan.md`

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

Write `D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
