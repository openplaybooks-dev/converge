---
id: 004-quality
title: "Quality gate — PR9 — Extract @converge/journal workspace package"
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
  parentId: 010-extract-journal-pkg
  title: "PR9 — Extract @converge/journal workspace package"
  tier: 3 — Leaf primitives
  task: "Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator."
  spec: "Create `packages/journal/` workspace package. High import churn (~40 sites).\n\n**Source (git mv):**\n- `packages/core/src/journal/*` → `packages/journal/src/journal/`\n- `packages/core/src/checkpoint/*` → `packages/journal/src/checkpoint/`\n- `packages/core/src/storage/*` → `packages/journal/src/storage/`\n\n**Rename (IMPORTANT):**\n- `journal/navigator.ts` (journal-side reader) → `journal/navigator-reader.ts`\n\nReason: `@converge/navigator` (PR3b) and `journal/navigator.ts` will otherwise be confusable in grep, IDE search, and stack traces. Rename to `navigator-reader.ts` before extraction so the name collision never exists in the new package.\n\n**Deps:** `zod` only.\n\n**Exports:**\n- `CheckpointManager`, `TaskCheckpointManager`, `UnitCheckpointManager`\n- `SessionLogger`\n- `FilesystemStorage`\n- `constructJournalPath`\n- `JournalCleanup`\n- (navigator-reader stays internal unless a consumer needs it)\n\n**Caveat — ensure-epic-checkpoints.ts:**\n\n`packages/core/src/checkpoint/ensure-epic-checkpoints.ts` imports from `scheduler/` (post-PR4). Moving it into `@converge/journal` would create a journal → scheduler dep, which inverts the onion (journal is more primitive than scheduler). \n\n**Resolution:** leave `ensure-epic-checkpoints.ts` in `packages/core/src/scheduler/` (not in this PR's move). PR10 moves it to `@converge/scheduler` along with the rest of scheduler.\n\n**Codemod for imports:**\n\n~40 sites import from journal/checkpoint/storage. Use `sed -i` or ts-morph to rewrite:\n- `../journal/X` → `@converge/journal` (for internal paths, pick the barrel export)\n- `../checkpoint/X` → `@converge/journal`\n- `../storage/X` → `@converge/journal`\n\nFind them: `grep -rln \"from.*['\\\"]\\\\.\\\\.*/(journal|checkpoint|storage)/\" packages/core/src`\n\n**Acceptance:**\n- `journal/navigator.ts` no longer exists; `journal/navigator-reader.ts` does\n- swebench + tbench tests green\n- `@converge/journal` tests pass in isolation\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/journal/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR9 — Extract @converge/journal workspace package

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
