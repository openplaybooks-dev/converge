---
id: 001-analyze
title: "Analyze — PR9 — Extract @converge/journal workspace package"
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 010-extract-journal-pkg
  title: "PR9 — Extract @converge/journal workspace package"
  tier: 3 — Leaf primitives
  task: "Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator."
  spec: "Create `packages/journal/` workspace package. High import churn (~40 sites).\n\n**Source (git mv):**\n- `packages/core/src/journal/*` → `packages/journal/src/journal/`\n- `packages/core/src/checkpoint/*` → `packages/journal/src/checkpoint/`\n- `packages/core/src/storage/*` → `packages/journal/src/storage/`\n\n**Rename (IMPORTANT):**\n- `journal/navigator.ts` (journal-side reader) → `journal/navigator-reader.ts`\n\nReason: `@converge/navigator` (PR3b) and `journal/navigator.ts` will otherwise be confusable in grep, IDE search, and stack traces. Rename to `navigator-reader.ts` before extraction so the name collision never exists in the new package.\n\n**Deps:** `zod` only.\n\n**Exports:**\n- `CheckpointManager`, `TaskCheckpointManager`, `UnitCheckpointManager`\n- `SessionLogger`\n- `FilesystemStorage`\n- `constructJournalPath`\n- `JournalCleanup`\n- (navigator-reader stays internal unless a consumer needs it)\n\n**Caveat — ensure-epic-checkpoints.ts:**\n\n`packages/core/src/checkpoint/ensure-epic-checkpoints.ts` imports from `scheduler/` (post-PR4). Moving it into `@converge/journal` would create a journal → scheduler dep, which inverts the onion (journal is more primitive than scheduler). \n\n**Resolution:** leave `ensure-epic-checkpoints.ts` in `packages/core/src/scheduler/` (not in this PR's move). PR10 moves it to `@converge/scheduler` along with the rest of scheduler.\n\n**Codemod for imports:**\n\n~40 sites import from journal/checkpoint/storage. Use `sed -i` or ts-morph to rewrite:\n- `../journal/X` → `@converge/journal` (for internal paths, pick the barrel export)\n- `../checkpoint/X` → `@converge/journal`\n- `../storage/X` → `@converge/journal`\n\nFind them: `grep -rln \"from.*['\\\"]\\\\.\\\\.*/(journal|checkpoint|storage)/\" packages/core/src`\n\n**Acceptance:**\n- `journal/navigator.ts` no longer exists; `journal/navigator-reader.ts` does\n- swebench + tbench tests green\n- `@converge/journal` tests pass in isolation\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/journal/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR9 — Extract @converge/journal workspace package

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** Move journal, checkpoint, storage into their own package. Rename journal/navigator.ts → navigator-reader.ts to avoid grep collision with @converge/navigator.

**Full spec:**

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

Write `D:/converge/.converge/artifacts/split-cli/010-extract-journal-pkg/analyze/plan.md`:

```markdown
# PR9 — Extract @converge/journal workspace package — Analysis

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
