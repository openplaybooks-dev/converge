# Execution Context System

The Converge framework uses a nested context hierarchy to manage state and scope during autonomous execution.

## Context Hierarchy

```
ProjectContext (root)
  ├─ vars, config, plugins
  ├─ fs, shell, git, log APIs
  │
  ├─ EpicContext (inherits ProjectContext)
  │    ├─ epicId, status, goals
  │    ├─ parent reference: project
  │    │
  │    └─ TaskContext (inherits EpicContext)
  │         ├─ taskId, status, config
  │         ├─ parent references: epic, project
  │         └─ EXECUTABLE WORK UNIT (leaf node)
  │
  └─ EpicContext (another epic)
       └─ TaskContext (executable)
```

## Context Levels

### 1. Project Context (Root)

- **Level**: `project`
- **Scope**: Entire workspace
- **Contains**:
  - Project configuration (name, description, goals)
  - Global variables accessible to all tasks
  - Filesystem, shell, git, and logging APIs
  - Plugin registry and management
  - Planning and evaluation APIs
- **Usage**: Top-level orchestration and global state management

### 2. Epic Context (Middle Layer)

- **Level**: `epic`
- **Scope**: Epic-specific goals and task orchestration
- **Contains**:
  - Epic ID and configuration
  - Epic-specific goals and status
  - Read-only reference to parent ProjectContext
  - Epic-scoped planning and evaluation
- **Usage**: Goal-based task orchestration and convergence tracking

### 3. Task Context (Leaf Node)

- **Level**: `task`
- **Scope**: Single executable work unit
- **Contains**:
  - Task ID and configuration
  - Task-specific status and metadata
  - Read-only references to parent EpicContext and ProjectContext
  - Check execution API
- **Usage**: Actual work execution - this is where Claude functions run

## Viewing Execution Context

Use the `--step --dry` flags to see the execution context hierarchy:

```bash
pnpm converge run --step --dry
```

**Output Example**:

```
📋 Execution Context (Nested Hierarchy):

┌─ Project Context
│  Name: My Project
│  Description: Transforms Google Sheets data...
│  Project Dir: /path/to/workspace
│  Converge Dir: /path/to/workspace/.converge
│
├─ Epic Context: 02-ux-ui-design-screen-generation
│    Title: UX/UI Design & Screen Generation
│    Description: Uses the design skills pipeline...
│    Goals: 0 goal(s)
│    Path: .converge/epics/02-ux-ui-design-screen-generation/epic.ts
│
│    ├─ Task Context (Executable): 003-generate-all-screens
│    │    Title: Generate screen generation tasks
│    │    Type: skill-task
│    │    Skill-based: Yes
│    │    Dependencies: 0
│    │
│    └─ Task Context (Executable): 001-create-ux-overview
│         Title: ux-overview.md exists
│         Type: skill-task
│         Skill-based: Yes
│
└─ Epic Context: 01-data-analysis-schema-design
     Title: Data Analysis & Schema Design
     ...
```

## Context Immutability

All contexts are **read-only** and **immutable**:

- Child contexts can read parent state but cannot modify it
- Each context level has isolated state
- Parent references are readonly to prevent circular modifications
- State changes flow through explicit APIs (journal, storage)

## API Access by Level

| API                      | Project | Epic | Task |
| ------------------------ | ------- | ---- | ---- |
| `fs` (filesystem)        | ✅      | ✅   | ✅   |
| `shell` (command exec)   | ✅      | ✅   | ✅   |
| `git` (git operations)   | ✅      | ✅   | ✅   |
| `log` (logging)          | ✅      | ✅   | ✅   |
| `eval` (gap detection)   | ✅      | ✅   | ❌   |
| `plan` (task generation) | ✅      | ✅   | ❌   |
| `plugins` (plugin mgmt)  | ✅      | ❌   | ❌   |
| `check` (validation)     | ✅      | ✅   | ✅   |

## Executable Work Units

Only **Task Context** is executable. Epic and Project contexts are organizational:

- **Epic Files** (`epic.ts`): Define goals and orchestrate tasks (not executable)
- **Task Files** (`task.ts` or `SKILL.md`): Executable work units
  - May call Claude functions
  - Can modify files and run commands
  - Return results and artifacts

## Task Types

### 1. Function-Based Tasks (`task.ts`)

```typescript
export default defineTask({
  id: "001-example",
  title: "Example Task",
  fn: "my-function", // References a Claude function
  type: "coding",
});
```

### 2. Skill-Based Tasks (`SKILL.md`)

```yaml
---
id: 001-example
title: Example Skill Task
type: skill-task
skill: stitch-design
---
Task instructions in markdown...
```

Both types are discovered and executed as **Task Context** (leaf nodes).

## Discovery vs Execution

**Discovery** (`--dry`):

- Scans glob patterns for task/epic/skill files
- Builds the context hierarchy
- Does NOT execute anything

**Execution** (`--step` without `--dry`):

- Walks the context hierarchy
- Executes tasks sequentially or in parallel
- Tracks gaps and convergence

**Step Dry** (`--step --dry`):

- Shows the full execution context hierarchy
- Useful for debugging and understanding structure
- No execution, no side effects

## Best Practices

1. **Keep tasks focused**: Each task should be a single, well-defined work unit
2. **Use epic goals**: Epic-level goals drive convergence and task generation
3. **Minimize cross-epic dependencies**: Epics should be largely independent
4. **Leverage context hierarchy**: Access parent context for global config, use task context for execution
5. **Use skill-based tasks for AI work**: Let Claude handle complex tasks via SKILL.md

## Related Documentation

- [Skill Discovery Patterns](./skill-based-tasks.md)
- [Task Configuration](../config/types.ts)
- [Context Types](../context/types.ts)
