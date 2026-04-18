# Journal Structure - Mirroring Epics

## Overview

The journal structure **mirrors the epics folder structure exactly**. This allows natural wiring of the two trees together.

## Structure Comparison

### Epics Folder (Task Definitions)

```
.converge/epics/
├── 01-prepare-requirements/
│   └── 001-gather-idea-generate-ux/
│       └── SKILL.md
├── 02-prepare-designs/
│   ├── 001-breakdown-ux-to-screens/
│   │   └── SKILL.md
│   ├── 002-generate-screen-prompts/
│   │   ├── task.ts
│   │   └── task/
│   │       ├── 002-001-prompt-home-dashboard/
│   │       │   └── SKILL.md
│   │       └── 002-002-prompt-lesson-tree/
│   │           └── SKILL.md
│   └── epic.ts
└── 03-implement-app/
    ├── 001-implement-design-system/
    │   └── SKILL.md
    ├── 003-generate-svg-assets/
    │   ├── task.ts
    │   └── task/
    │       ├── 003-001-asset-logo/
    │       │   └── SKILL.md
    │       └── 003-002-asset-icon-home/
    │           └── SKILL.md
    └── epic.ts
```

### Journal Folder (Execution History) - NEW STRUCTURE

```
.converge/journal/tasks/
├── 01-prepare-requirements/
│   └── 001-gather-idea-generate-ux/
│       ├── checkpoint.json
│       ├── attempts/
│       │   ├── 01/
│       │   └── 02/
│       └── logs/
├── 02-prepare-designs/
│   ├── 001-breakdown-ux-to-screens/
│   │   ├── checkpoint.json
│   │   └── attempts/
│   ├── 002-generate-screen-prompts/
│   │   ├── checkpoint.json
│   │   ├── attempts/
│   │   └── task/
│   │       ├── 002-001-prompt-home-dashboard/
│   │       │   ├── checkpoint.json
│   │       │   └── attempts/
│   │       └── 002-002-prompt-lesson-tree/
│   │           ├── checkpoint.json
│   │           └── attempts/
│   └── checkpoint.json
└── 03-implement-app/
    ├── 001-implement-design-system/
    │   ├── checkpoint.json
    │   └── attempts/
    ├── 003-generate-svg-assets/
    │   ├── checkpoint.json
    │   ├── attempts/
    │   └── task/
    │       ├── 003-001-asset-logo/
    │       │   ├── checkpoint.json
    │       │   └── attempts/
    │       └── 003-002-asset-icon-home/
    │           ├── checkpoint.json
    │           └── attempts/
    └── checkpoint.json
```

## Key Principles

1. **Exact Mirror**: Journal structure mirrors epics folder 1:1
2. **Same Paths**: Task paths are identical in both trees
3. **Natural Wiring**: Can join trees by matching paths directly
4. **No Extra Levels**: No `/tasks/` subdirectory in journal - mirrors exactly

## Path Mapping

Given a task path in epics:

```
.converge/epics/03-implement-app/001-implement-design-system/SKILL.md
```

The corresponding journal path is:

```
.converge/journal/tasks/03-implement-app/001-implement-design-system/checkpoint.json
```

## Benefits

### 1. Natural Tree Wiring

Can wire TaskTree and JournalTree together by path:

```typescript
const taskTree = await TaskTree.load(projectDir, config);
const journalTree = await JournalTree.load(projectDir);

// Wire them together
for (const taskNode of taskTree.getAllNodes()) {
  const taskPath = taskNode.unit.path; // e.g., ".converge/epics/03-implement-app/001-task"
  const journalPath = taskPath.replace("/epics/", "/journal/tasks/");
  const journalNode = journalTree.getNodeByPath(journalPath);

  // Link them
  taskNode.journalNode = journalNode;
  journalNode.taskNode = taskNode;
}
```

### 2. Simple Lookup

Given a task unit, find its journal:

```typescript
const unit = await Unit.fromPath(".converge/epics/03-implement-app/001-task");
const journalPath = unit.path.replace("/epics/", "/journal/tasks/");
const checkpoint = await readFile(path.join(journalPath, "checkpoint.json"));
```

### 3. Consistent Navigation

Both trees have identical structure - walk one, walk the other the same way.

### 4. Clear Separation

- Epics folder = "what to do" (definitions)
- Journal folder = "what was done" (execution history)

## Backward Compatibility

The code supports both structures:

- **Old**: `.converge/journal/tasks/03-implement-app/tasks/001-task/`
- **New**: `.converge/journal/tasks/03-implement-app/001-task/`

When loading, it checks for `tasks/` subdirectory first (old structure) and falls back to mirrored structure (new).

## Migration

New journals created with updated `UnitCheckpointManager` will use the mirrored structure. Old journals continue to work via backward compatibility.

To migrate old journals to new structure:

```bash
# Move tasks out of tasks/ subdirectory
cd .converge/journal/tasks/03-implement-app
mv tasks/* .
rmdir tasks
```

## Implementation

### UnitCheckpointManager

```typescript
private getCheckpointPath(): string {
  const journalRoot = path.join(this.projectDir, '.converge', 'journal');

  switch (this.unitType) {
    case 'task':
      // Mirror epics structure exactly (no "tasks/" subdirectory)
      const segments = this.taskId.split('/').filter(Boolean);
      return path.join(journalRoot, 'epics', this.epicId, ...segments, 'checkpoint.json');
  }
}
```

### JournalTree

```typescript
// Support both old and new structures
const tasksDir = path.join(epicDir, "tasks");
const searchDir = existsSync(tasksDir) ? tasksDir : epicDir; // Backward compat

// Recursively find all checkpoints
const checkpoints = await this.findCheckpoints(searchDir);
```
