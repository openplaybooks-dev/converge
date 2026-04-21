# Task: 11-clean-exports-and-verify

Final cleanup and verification.

**`packages/core/src/index.ts`:**
- Remove all epic exports: EpicConfig, EpicStatus, EpicDeps, EpicConfigSchema, EpicStatusSchema, EpicManager, EpicManagerImpl, EpicContext, createEpicContext, EpicContextImpl, EpicDefinition, EpicBuilder, V2EpicDefinition, etc.
- Add new export: PlaybookContext

**Tests:**
- Update `packages/core/src/tree/__tests__/task-tree.test.ts`
- Update `packages/core/src/agent-manager/__tests__/agent-manager.test.ts`
- Run full test suite

**Final verification:**
1. `grep -rn 'epicId\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition' packages/core/src/` — must return zero results
2. `cd packages/core && npx tsc --noEmit` — must compile clean
3. Run test suite