# Task: 01-delete-epic-files

Remove epic-related interfaces from existing files (not separate files — epic logic is distributed).

**`packages/core/src/context/types.ts`:**
- Delete `EpicContext` interface entirely
- Remove `EpicContext` from any exports

**`packages/core/src/runtime/types.ts`:**
- Delete `EpicManager` interface entirely
- Remove `epics: EpicManager` from Runtime interface

**`packages/core/src/hooks/types.ts`:**
- Remove epic lifecycle hooks: `epic:start`, `epic:complete`, `epic:fail`, `epic:skip`
- Remove `epicId` from all hook event payload interfaces

**`packages/core/src/context/index.ts`:**
- Remove `EpicContext`, `createEpicContext`, `EpicContextImpl` exports

**`packages/core/src/index.ts`:**
- Remove all epic re-exports: `EpicConfig`, `EpicStatus`, `EpicDeps`, `EpicConfigSchema`, `EpicStatusSchema`, `EpicManager`, `EpicManagerImpl`, `EpicContext`, `EpicContextImpl`, `EpicDefinition`, `EpicBuilder`, `V2EpicDefinition`, etc.

Comment out broken downstream references temporarily (they'll be fixed in later tasks). PlaybookContext and PlaybookConfig will be added in tasks 02-03.