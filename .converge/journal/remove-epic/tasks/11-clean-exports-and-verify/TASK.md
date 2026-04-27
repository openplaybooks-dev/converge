---
id: 11-clean-exports-and-verify
title: Clean index exports, update tests, final verification
blocking: true
dependencies: [10-refactor-remaining-systems]
checks:
  - id: no-epic-refs
    cmd: "test -z \"$(grep -rn 'epicId\\|EpicId\\|epic_id\\|EpicConfig\\|EpicStatus\\|EpicContext\\|EpicManager\\|EpicDefinition\\|EpicBuilder\\|EpicDeps\\|epicConfig\\|epicStatus\\|epicDeps\\|epicLog\\|epicTasks\\|extractEpicId\\|extractEpicDir\\|transitionEpic\\|getEpicTasksDir\\|getEpicsDir\\|runEpicConvergence\\|discoverEpicIds\\|appendEpicLog' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')\""
    description: Zero epic references in packages/core/src
  - id: tsc-clean
    cmd: "cd packages/core && npx tsc --noEmit"
    description: TypeScript compiles clean
---

Final cleanup and verification.

**`packages/core/src/index.ts`:**
- Remove all epic exports: EpicConfig, EpicStatus, EpicDeps, EpicConfigSchema, EpicStatusSchema, EpicManager, EpicManagerImpl, EpicContext, createEpicContext, EpicContextImpl, EpicDefinition, EpicBuilder, V2EpicDefinition, etc.
- Add PlaybookContext, PlaybookConfig, PlaybookStatus, PlaybookDefinition, PlaybookBuilder exports

**Tests:**
- Update `packages/core/src/tree/__tests__/task-tree.test.ts`
- Update `packages/core/src/agent-manager/__tests__/agent-manager.test.ts`
- Run full test suite

**Final verification:**
1. `grep -rn 'epicId\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition' packages/core/src/` — must return zero results
2. `cd packages/core && npx tsc --noEmit` — must compile clean
3. Run test suite
