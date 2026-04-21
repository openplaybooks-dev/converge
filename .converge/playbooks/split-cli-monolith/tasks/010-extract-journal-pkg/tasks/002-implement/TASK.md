---
id: 002-implement
title: "Implement — PR9 — Extract @converge/journal workspace package"
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/wbs.js"
vars:
  taskId: 002-implement
  parentId: 010-extract-journal-pkg
  title: "PR9 — Extract @converge/journal workspace package"
  tier: 3 — Leaf primitives
  task: "Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator."
  spec: "Create `packages/journal/` workspace package. High import churn (~40 sites).\n\n**Source (git mv):**\n- `packages/core/src/journal/*` → `packages/journal/src/journal/`\n- `packages/core/src/checkpoint/*` → `packages/journal/src/checkpoint/`\n- `packages/core/src/storage/*` → `packages/journal/src/storage/`\n\n**Rename (IMPORTANT):**\n- `journal/navigator.ts` (journal-side reader) → `journal/navigator-reader.ts`\n\nReason: `@converge/navigator` (PR3b) and `journal/navigator.ts` will otherwise be confusable in grep, IDE search, and stack traces. Rename to `navigator-reader.ts` before extraction so the name collision never exists in the new package.\n\n**Deps:** `zod` only.\n\n**Exports:**\n- `CheckpointManager`, `TaskCheckpointManager`, `UnitCheckpointManager`\n- `SessionLogger`\n- `FilesystemStorage`\n- `constructJournalPath`\n- `JournalCleanup`\n- (navigator-reader stays internal unless a consumer needs it)\n\n**Caveat — ensure-epic-checkpoints.ts:**\n\n`packages/core/src/checkpoint/ensure-epic-checkpoints.ts` imports from `scheduler/` (post-PR4). Moving it into `@converge/journal` would create a journal → scheduler dep, which inverts the onion (journal is more primitive than scheduler). \n\n**Resolution:** leave `ensure-epic-checkpoints.ts` in `packages/core/src/scheduler/` (not in this PR's move). PR10 moves it to `@converge/scheduler` along with the rest of scheduler.\n\n**Codemod for imports:**\n\n~40 sites import from journal/checkpoint/storage. Use `sed -i` or ts-morph to rewrite:\n- `../journal/X` → `@converge/journal` (for internal paths, pick the barrel export)\n- `../checkpoint/X` → `@converge/journal`\n- `../storage/X` → `@converge/journal`\n\nFind them: `grep -rln \"from.*['\\\"]\\\\.\\\\.*/(journal|checkpoint|storage)/\" packages/core/src`\n\n**Acceptance:**\n- `journal/navigator.ts` no longer exists; `journal/navigator-reader.ts` does\n- swebench + tbench tests green\n- `@converge/journal` tests pass in isolation\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/journal/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/wbs.js\""
---

# Implement — PR9 — Extract @converge/journal workspace package

Read the analysis, split into todos, execute each, then verify.

Pipeline: **plan → todos → verify**.
