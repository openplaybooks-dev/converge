# Execution Flow - Mirrored Journal Structure

## Overview

When executing a task, the journal path mirrors the epics structure exactly. This makes it simple and clear where all execution artifacts go.

## Execution Flow

### 1. Load Task from Epics
```typescript
const taskPath = '.converge/epics/03-implement-app/001-implement-design-system';
const unit = await Unit.fromPath(taskPath);
```

### 2. Compute Journal Path (Automatic)
```typescript
// TaskContext automatically computes journalPath by mirroring epics structure
const context = createTaskContext(taskPath);

console.log(context.journalPath);
// → .converge/journal/tasks/03-implement-app/001-implement-design-system
```

**Simple rule**: Replace `/epics/` with `/journal/tasks/` - that's it!

### 3. Execute Task - All Artifacts Go to Journal Path
```typescript
const journalPath = context.journalPath;
// → .converge/journal/tasks/03-implement-app/001-implement-design-system

// All execution artifacts go inside this mirrored path:
journalPath/
├── checkpoint.json          # Task status, attempts
├── attempts/
│   ├── 01/                  # First attempt
│   │   ├── TASK.md          # Task description
│   │   ├── NEEDS.md         # Required inputs
│   │   ├── CHECK.md         # Check results
│   │   ├── logs/
│   │   │   ├── events.jsonl
│   │   │   └── facts.jsonl
│   │   ├── data/
│   │   └── materials/
│   └── 02/                  # Second attempt (if first failed)
│       └── ...
└── logs/
    └── facts.jsonl          # Aggregated facts
```

### 4. No Confusion
- **Task definition**: `.converge/epics/03-implement-app/001-task/`
- **Task execution**: `.converge/journal/tasks/03-implement-app/001-task/`

Same path, different root. Simple!

## Example: WBS Parent with Children

### Task Structure
```
.converge/epics/03-implement-app/
└── 003-generate-svg-assets/
    ├── task.ts              # WBS parent task
    └── task/
        ├── 003-001-asset-logo/
        │   └── SKILL.md
        └── 003-002-asset-icon-home/
            └── SKILL.md
```

### Journal Structure (Mirrors Exactly)
```
.converge/journal/tasks/03-implement-app/
└── 003-generate-svg-assets/
    ├── checkpoint.json      # Parent task status
    ├── attempts/
    │   └── 01/
    └── task/
        ├── 003-001-asset-logo/
        │   ├── checkpoint.json
        │   └── attempts/
        │       └── 01/
        └── 003-002-asset-icon-home/
            ├── checkpoint.json
            └── attempts/
                └── 01/
```

**Perfect mirror!** The `/task/` subdirectory exists in both places.

## Code Example: Execution

```typescript
// 1. Load task from epics
const taskPath = '.converge/epics/03-implement-app/001-implement-design-system';
const unit = await Unit.fromPath(taskPath);

// 2. Get journal path (automatic via context)
const journalPath = unit.context.journalPath;
// → .converge/journal/tasks/03-implement-app/001-implement-design-system

// 3. Execute task - all artifacts go to journalPath
const result = await unit.run();

// 4. Find checkpoint
const checkpointPath = path.join(journalPath, 'checkpoint.json');
const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf-8'));

// 5. Find latest attempt logs
const attemptDir = path.join(journalPath, 'attempts', '01');
const eventsLog = path.join(attemptDir, 'logs/events.jsonl');
```

## Benefits

### 1. No Path Confusion
Same structure everywhere - if you know the task path, you know the journal path.

### 2. Simple Lookup
```typescript
// From task path to journal path
const journalPath = taskPath.replace('/epics/', '/journal/tasks/');

// From journal path back to task path
const taskPath = journalPath.replace('/journal/tasks/', '/epics/');
```

### 3. Natural Tree Wiring
```typescript
const taskTree = await TaskTree.load(projectDir, config);
const journalTree = await JournalTree.load(projectDir);

// Wire them together
for (const taskNode of taskTree.getAllNodes()) {
  const taskPath = taskNode.unit.path;
  const journalPath = taskNode.unit.context.journalPath;
  const journalNode = journalTree.getNodeByPath(journalPath);

  // Now they're linked!
  taskNode.journalNode = journalNode;
  journalNode.taskNode = taskNode;
}
```

### 4. Clean Execution
All execution artifacts stay in their mirrored journal folder:
- No mixing of definition and execution
- Easy to clean (delete journal, keep definitions)
- Easy to archive (zip journal per epic)
- Easy to debug (all logs in one place)

## Checkpoint Manager Usage

The `UnitCheckpointManager` already uses the mirrored structure:

```typescript
const ckpt = new UnitCheckpointManager(
  projectDir,
  'task',
  '03-implement-app',        // epicId
  '001-implement-design-system'  // taskId
);

// Checkpoint path:
// .converge/journal/tasks/03-implement-app/001-implement-design-system/checkpoint.json
```

For WBS children:
```typescript
const ckpt = new UnitCheckpointManager(
  projectDir,
  'task',
  '03-implement-app',
  '003-generate-svg-assets/task/003-001-asset-logo'  // nested taskId
);

// Checkpoint path:
// .converge/journal/tasks/03-implement-app/003-generate-svg-assets/task/003-001-asset-logo/checkpoint.json
```

Perfect mirror!

## Summary

**Execution flow is simple:**
1. Load task from epics folder
2. Get mirrored journal path (automatic)
3. Execute task - all artifacts go to journal path
4. No confusion, no extra levels, perfect mirror!
