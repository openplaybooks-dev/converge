---
id: 001-execute
title: "Execute: Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator."
---

Implement the PR.

**Summary:** Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator.

**Spec:**
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

**Analysis:** `D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg/analyze/plan.md`
