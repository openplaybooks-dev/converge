# Journal Structure Guide

## Overview

The journal system uses a **hierarchical directory structure** that mirrors the task organization, making it easy for AI to navigate and understand context at each level.

## Directory Structure

```
.converge/journal/
├── README.md                    # Journal system guide
├── project/                     # PROJECT LEVEL
│   ├── gaps.yml                 # Current project gaps
│   ├── events.jsonl             # Project events
│   ├── log.log                  # Human-readable log
│   └── summary.md               # Project overview with navigation
│
└── epics/                       # ALL EPICS
    ├── 01-api/                  # EPIC LEVEL (API Development)
    │   ├── gaps.yml             # Epic gaps
    │   ├── events.jsonl         # Epic events
    │   ├── log.log              # Epic log
    │   ├── summary.md           # Epic overview with navigation
    │   │
    │   └── tasks/               # ALL TASKS IN THIS EPIC
    │       ├── setup-db/        # TASK LEVEL (Setup Database)
    │       │   ├── gaps.yml     # Task gaps
    │       │   ├── events.jsonl # Task events
    │       │   ├── log.log      # Task log
    │       │   └── summary.md   # Task overview
    │       │
    │       └── create-api/      # TASK LEVEL (Create API)
    │           ├── gaps.yml
    │           ├── events.jsonl
    │           ├── log.log
    │           └── summary.md
    │
    └── 02-webapp/               # EPIC LEVEL (Webapp Development)
        ├── gaps.yml
        ├── events.jsonl
        ├── log.log
        ├── summary.md
        └── tasks/
            └── setup-ui/
                ├── gaps.yml
                ├── events.jsonl
                ├── log.log
                └── summary.md
```

## Benefits of Hierarchical Structure

### 1. Natural Navigation

AI can easily navigate the hierarchy:

```typescript
// Start at project level
const project = await getProjectOverview(projectDir, "MyProject");
console.log(`Project has ${project.epicCount} epics`);

// Navigate to an epic
const epic = await getEpicOverview(projectDir, "MyProject", "01-api");
console.log(`Epic has ${epic.taskCount} tasks`);

// Navigate to a task
const task = await getTaskOverview(
  projectDir,
  "MyProject",
  "01-api",
  "setup-db",
);
console.log(`Task has ${task.gaps.length} gaps`);
```

### 2. Clear Context

Each level has its own directory with:

- **gaps.yml** - Current gaps at this level
- **events.jsonl** - Events that occurred at this level
- **log.log** - Human-readable log
- **summary.md** - Overview with breadcrumbs and navigation links

### 3. Breadcrumb Navigation

Every `summary.md` includes breadcrumbs:

```markdown
# Setup Database

**Breadcrumb**: [MyProject](../../../../project/summary.md) > [API Development](../../summary.md) > Setup Database

### Parent

- [← Back to Epic](../../summary.md)
- [← Back to Project](../../../../project/summary.md)
```

### 4. Child Discovery

AI can discover what's under each level:

```typescript
// List all epics
const epics = await listEpics(projectDir, "MyProject");
// → [{ id: '01-api', gapCount: 2, taskCount: 3 }, ...]

// List tasks in an epic
const tasks = await listTasks(projectDir, "MyProject", "01-api");
// → [{ id: 'setup-db', gapCount: 1 }, ...]
```

### 5. Smart Search

Find all items with gaps:

```typescript
const itemsWithGaps = await findItemsWithGaps(projectDir, 'MyProject');

// Result:
{
  project: { gapCount: 1 },
  epics: [{ id: '01-api', gapCount: 2 }],
  tasks: [{ epicId: '01-api', taskId: 'setup-db', gapCount: 1 }]
}
```

## File Types

### 1. gaps.yml (YAML)

Structured gap data with summary:

```yaml
total: 2
byType:
  structural: 1
  semantic: 1
bySeverity:
  high: 1
  medium: 1
updated: "2025-01-15T12:30:00.000Z"
gaps:
  - id: gap-001
    type: structural
    description: Database not initialized
    severity: high
    # ... full gap details
```

### 2. events.jsonl (JSON Lines)

One JSON object per line, easy to stream and parse:

```jsonl
{"timestamp":"2025-01-15T10:00:00.000Z","eventType":"TASK_START","level":"task","scope":"01-api.setup-db","message":"Starting database setup"}
{"timestamp":"2025-01-15T10:05:00.000Z","eventType":"ERROR","level":"task","scope":"01-api.setup-db","message":"Connection timeout"}
{"timestamp":"2025-01-15T10:10:00.000Z","eventType":"TASK_COMPLETE","level":"task","scope":"01-api.setup-db","message":"Task completed"}
```

### 3. log.log (Plain Text)

Human-readable timestamped log:

```
[2025-01-15T10:00:00.000Z] [TASK_START] Starting database setup
[2025-01-15T10:05:00.000Z] [ERROR] Connection timeout
[2025-01-15T10:10:00.000Z] [TASK_COMPLETE] Task completed
```

### 4. summary.md (Markdown)

Overview with navigation, breadcrumbs, and gap details.

## AI Usage Patterns

### Starting at Project Level

```typescript
// Get high-level overview
const overview = await getProjectOverview(projectDir, "MyProject");

console.log(`📊 ${overview.location.breadcrumbs[0].name}`);
console.log(`   Epics: ${overview.epicCount}`);
console.log(`   Tasks: ${overview.totalTaskCount}`);
console.log(`   Gaps: ${overview.gaps.length}`);

// See available epics
for (const epic of overview.location.children) {
  console.log(`   - ${epic.id} (${epic.gapCount} gaps)`);
}
```

### Drilling Down to Epic

```typescript
// Navigate to specific epic
const epic = await getEpicOverview(projectDir, "MyProject", "01-api");

console.log(`📊 ${epic.location.breadcrumbs[1].name}`);
console.log(
  `   Breadcrumb: ${epic.location.breadcrumbs.map((b) => b.name).join(" > ")}`,
);
console.log(`   Tasks: ${epic.taskCount}`);
console.log(`   Gaps: ${epic.gaps.length}`);

// See available tasks
for (const task of epic.location.children) {
  console.log(`   - ${task.id} (${task.gapCount} gaps)`);
}
```

### Drilling Down to Task

```typescript
// Navigate to specific task
const task = await getTaskOverview(
  projectDir,
  "MyProject",
  "01-api",
  "setup-db",
);

console.log(`📊 ${task.location.breadcrumbs[2].name}`);
console.log(
  `   Breadcrumb: ${task.location.breadcrumbs.map((b) => b.name).join(" > ")}`,
);
console.log(`   Gaps: ${task.gaps.length}`);

// Show gap details
for (const gap of task.gaps) {
  console.log(`   - [${gap.severity}] ${gap.description}`);
}
```

### Quick Discovery

```typescript
// Find all items that need work
const itemsWithGaps = await findItemsWithGaps(projectDir, "MyProject");

if (itemsWithGaps.project.gapCount > 0) {
  console.log("⚠️  Project has unresolved gaps");
}

if (itemsWithGaps.tasks.length > 0) {
  console.log(`⚠️  ${itemsWithGaps.tasks.length} tasks need attention:`);
  for (const task of itemsWithGaps.tasks) {
    console.log(`   - ${task.epicId}/${task.taskId} (${task.gapCount} gaps)`);
  }
}
```

## Comparison: Old vs New Structure

### Old Structure (Flat)

```
.converge/journal/
├── project.gaps.yml
├── project.events.jsonl
├── project.log.log
├── 01-api.gaps.yml
├── 01-api.events.jsonl
├── 01-api.log.log
├── 01-api.setup-db.gaps.yml
├── 01-api.setup-db.events.jsonl
├── 01-api.setup-db.log.log
├── 01-api.create-api.gaps.yml
├── 01-api.create-api.events.jsonl
└── ... (gets messy with many tasks)
```

**Problems:**

- Hard to see hierarchy at a glance
- No clear parent/child relationships
- File names get long and repetitive
- No navigation between levels

### New Structure (Hierarchical)

```
.converge/journal/
├── project/
│   └── (project files)
└── epics/
    ├── 01-api/
    │   ├── (epic files)
    │   └── tasks/
    │       ├── setup-db/
    │       │   └── (task files)
    │       └── create-api/
    │           └── (task files)
    └── 02-webapp/
        └── ...
```

**Benefits:**

- Clear hierarchy visible in directory structure
- Easy to navigate with file browser
- Natural parent/child relationships
- Each level has summary.md with navigation links
- Scales to hundreds of tasks

## API Examples

### Get Current Location

```typescript
const location = await getLocation(
  projectDir,
  "MyProject",
  "01-api",
  "API Development",
  "setup-db",
  "Setup Database",
);

console.log("Current level:", location.level);
console.log("Breadcrumb:", location.breadcrumbs.map((b) => b.name).join(" > "));
console.log("Files:", location.files);
console.log("Children:", location.children);
console.log("Parent:", location.parent);
```

### List All Epics

```typescript
const epics = await listEpics(projectDir, "MyProject");

for (const epic of epics) {
  console.log(`${epic.id}: ${epic.gapCount} gaps, ${epic.taskCount} tasks`);
}
```

### List Tasks in Epic

```typescript
const tasks = await listTasks(projectDir, "MyProject", "01-api");

for (const task of tasks) {
  console.log(`${task.id}: ${task.gapCount} gaps`);
}
```

## Migration

The new structure is backward compatible through the legacy `getJournalPath()` function, which automatically converts scope strings to the new hierarchical paths:

```typescript
// Legacy call (still works)
const path = getJournalPath(projectDir, "task", "01-api.setup-db", "gaps");
// → .converge/journal/tasks/01-api/tasks/setup-db/gaps.yml

// New call (recommended)
const path = getJournalFilePath(
  projectDir,
  "task",
  "gaps",
  "01-api",
  "setup-db",
);
// → .converge/journal/tasks/01-api/tasks/setup-db/gaps.yml
```

## Summary

The hierarchical journal structure makes it easy for AI to:

1. ✅ **Navigate** - Move between project → epic → task levels
2. ✅ **Discover** - Find all epics, tasks, and items with gaps
3. ✅ **Understand Context** - See breadcrumbs and parent/child relationships
4. ✅ **Access Information** - Read gaps, events, and logs at each level
5. ✅ **Self-Plan** - Identify what needs work and where to focus

The structure mirrors how humans think about projects, making it intuitive and easy to work with.
