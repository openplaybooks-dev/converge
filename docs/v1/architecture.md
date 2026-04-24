# Architecture Overview

## System Context (C4 Level 1)

```mermaid
graph TB
    User[[User]] -->|configures| Converge[[Converge Framework]]
    Converge -->|executes tasks| Filesystem[(Filesystem<br/>.converge/)]
    Converge -->|calls AI| AIPovider[[AI Provider<br/>Claude/Gemini/Kimi/Qwen]]
    AIPovider -->|response| Converge
    Converge -->|logs events| Journal[[Journal/Event Log]]
```

## Container Architecture (C4 Level 2)

```mermaid
graph TB
    subgraph "Converge Framework"
        Orchestrator[Orchestrator<br/>convergence.ts]
        Runtime[Runtime<br/>runtime.ts]
        Executor[Executor<br/>function-executor.ts]
        Gap[Gap Detector<br/>gap/detector.ts]
        Goal[Goal System<br/>goal/evaluator.ts]
        Hooks[Hook Registry<br/>hooks/registry.ts]
        Journal[Journal<br/>journal/]
        Checkpoint[Checkpoint<br/>checkpoint/]
    end

    Orchestrator --> Runtime
    Orchestrator --> Gap
    Orchestrator --> Goal
    Orchestrator --> Executor
    Orchestrator --> Hooks
    Orchestrator --> Checkpoint
    Executor --> Journal
    Checkpoint --> Filesystem[(Filesystem)]
    Runtime --> Filesystem
```

## Convergence Loop (Component Architecture)

```mermaid
flowchart TD
    Start([Start]) --> Evaluate[GapDetector.detectEpicGaps]
    Evaluate --> Analyze[ConvergenceAnalyzer.analyzeConvergence]
    Analyze --> Plan[ctx.plan.generateTasks]
    Plan --> Execute[executeTasks]
    Execute --> Checkpoint[createCheckpoint]
    Checkpoint -->|not converged| Evaluate
    Checkpoint -->|converged| Done([Done])
```

## Core Components

### Orchestrator (`orchestrator/convergence.ts`)
- **Responsibility**: Main convergence loop controller
- **Role**: Coordinates evaluate → plan → execute → checkpoint cycle
- **Key Method**: `runEpicConvergence()`

### Runtime (`runtime/runtime.ts`)
- **Responsibility**: Provides all manager interfaces
- **Components**:
  - `GoalManagerImpl` - Goal hierarchy management
  - `TaskManagerImpl` - Task lifecycle management
  - `EpicManagerImpl` - Epic coordination
  - `ProjectManagerImpl` - Project-level operations

### Gap System (`gap/detector.ts`)
- **Responsibility**: Detect and track gaps between current and desired state
- **Components**:
  - `GapDetector` - Identifies gaps
  - `ConvergenceAnalyzer` - Analyzes convergence state
- **Gap Types**: structural, semantic, quality, integration
- **Gap Levels**: project, epic, task

### Goal System (`goal/evaluator.ts`)
- **Responsibility**: Goal hierarchy and satisfaction evaluation
- **Hierarchy**: Epic → Goal → Sub-goal
- **Key Functions**: `GoalEvaluatorImpl`, `extractTasksFromUnsatisfiedGoals()`

### Executor (`executor/function-executor.ts`)
- **Responsibility**: Execute TaskFn via registry with retry logic
- **Components**:
  - `FunctionExecutor` - Single task execution
  - `BatchExecutor` - Parallel execution
- **Features**: Exponential backoff retry, post-execution checks

### Function Registry (`functions/registry.ts`)
- **Responsibility**: Central registry for all functions
- **Function Types**:
  - `CheckFn` - Verification functions
  - `EvalFn` - Evaluation functions
  - `PlanFn` - Planning functions
  - `TaskFn` - Task execution functions

### Context System (`context/`)
- **Responsibility**: Immutable context hierarchy
- **Hierarchy**:
  - `ProjectContext` - Project-level APIs (fs, shell, log, git, eval, plan)
  - `EpicContext` - Epic-level context (inherits ProjectContext)
  - `TaskContext` - Task-level context (inherits EpicContext)
- **Pattern**: Read-only access, child inherits from parent

### Storage (`storage/`)
- **Responsibility**: Filesystem-native persistence
- **Locations**:
  - `.converge/project.yaml` - Project config
  - `.converge/epics/{id}.yaml` - Epic configs
  - `.converge/epics/{id}/tasks/{id}.yaml` - Task configs
  - `.converge/epics/{id}.status.yaml` - Runtime status
- **Pattern**: YAML configs tracked in git, status files runtime-generated

### Hooks (`hooks/registry.ts`)
- **Responsibility**: Lifecycle event system
- **Events**: task:start, task:complete, epic:start, epic:complete, gap:resolved
- **Features**: Priority ordering, error isolation, legacy plugin bridge

### Journal (`journal/`)
- **Responsibility**: Event logging and execution trace
- **Components**:
  - `EventWriter` - Writes events to log
  - `ExecutionTrace` - Traces task execution
  - `GapLedger` - Tracks gap resolution

### Checkpoint (`checkpoint/`)
- **Responsibility**: Crash-safe resumability
- **V3 Model**: Stores cursor + execution context only
- **Pattern**: Tree traversal naturally resumes from cursor

## Wave-Based Convergence Model

```mermaid
sequenceDiagram
    participant Orchestrator
    participant RED
    participant YELLOW
    participant GREEN
    participant Score

    Orchestrator->>RED: evaluateGoals()
    RED-->>Orchestrator: Gap[]
    Orchestrator->>YELLOW: planFromGoals(gaps)
    YELLOW-->>Orchestrator: TaskConfig[]
    Orchestrator->>GREEN: autonomousRun(tasks)
    GREEN-->>Orchestrator: ExecutionResult
    Orchestrator->>Score: totalScore(gaps)
    Score-->>Orchestrator: converged?
```

**Waves**:
1. **RED Wave**: Evaluate all goals for satisfaction
2. **YELLOW Wave**: Generate TASK.md files for unsatisfied goals
3. **GREEN Wave**: Execute implementation tasks
4. **Score**: Measure progress, repeat if not converged

## Key Design Decisions

### 1. Filesystem-Native Storage
- **Decision**: `.converge/` directory IS the plan
- **Rationale**: `ls` becomes dashboard, `git diff` shows changes, no opaque state
- **Trade-off**: Less efficient than DB, but more debuggable and git-friendly

### 2. Gap-Driven vs Task-Driven
- **Decision**: Gaps drive work generation, not static task lists
- **Rationale**: System adapts to actual state, not assumed state
- **Trade-off**: More compute at runtime, but more reliable convergence

### 3. Immutable Context Hierarchy
- **Decision**: ProjectContext → EpicContext → TaskContext (read-only inheritance)
- **Rationale**: Prevents accidental cross-task contamination
- **Trade-off**: More object creation, but safer execution

### 4. Shell-Based Verification
- **Decision**: Checks are shell commands (`grep`, `npm test`)
- **Rationale**: Real assertions against real files, no mocking
- **Trade-off**: Platform-dependent, but trustworthy

## Module Dependencies

```mermaid
graph TD
    Functions[functions/registry] --> Context[context/]
    Context --> Storage[storage/]
    Executor[executor/] --> Functions
    Executor --> Context
    Executor --> Hooks[hooks/]
    Orchestrator[orchestrator/] --> Executor
    Orchestrator --> Gap[gap/detector]
    Orchestrator --> Goal[goal/]
    Orchestrator --> Hooks
    Orchestrator --> Checkpoint[checkpoint/]
    Runtime[runtime/] --> Storage
    Runtime --> Context
```
