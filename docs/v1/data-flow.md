# Data Flow

## End-to-End Execution Flow

```mermaid
flowchart TD
    User[User] -->|1. Configure| Config[Project Config<br/>.converge/project.yaml]
    Config -->|2. Load| Runtime[Runtime]
    Runtime -->|3. Create| EpicContext[EpicContext]
    EpicContext -->|4. Detect| Gaps[Gaps]
    Gaps -->|5. Analyze| Analyzer[ConvergenceAnalyzer]
    Analyzer -->|6. Plan| Tasks[Tasks]
    Tasks -->|7. Execute| Executor[Executor]
    Executor -->|8. Check| Checks[Checks]
    Checks -->|9. Log| Journal[Journal]
    Journal -->|10. Checkpoint| Checkpoint[Checkpoint]
    Checkpoint -->|loop| Gaps
```

## Convergence Orchestrator Flow

```mermaid
flowchart TD
    Start([Start]) --> Init[Initialize Runtime]
    Init --> While{Not Converged<br/>& Not Stalled}
    While -->|Yes| Evaluate[GapDetector.detectEpicGaps]
    Evaluate --> Analyze[ConvergenceAnalyzer.analyzeConvergence]
    Analyze --> Check{Converged?}
    Check -->|No| Plan[Generate Tasks from Gaps]
    Check -->|Yes| Done([Done])
    Plan --> Execute[Execute Tasks]
    Execute --> Checkpoint[Create Checkpoint]
    Checkpoint --> While
    While -->|No| Done
```

## Data Flow Between Modules

### 1. Configuration Loading

```mermaid
sequenceDiagram
    participant User
    participant Loader[Config Loader]
    participant Storage[FilesystemStorage]
    participant Runtime[Runtime]

    User->>Loader: findConvergeConfig()
    Loader->>Storage: read .converge/project.yaml
    Storage-->>Loader: ProjectConfig
    Loader-->>Runtime: ConvergeConfig
    Runtime->>Runtime: createRuntime(config)
```

### 2. Gap Detection

```mermaid
sequenceDiagram
    participant Orchestrator
    participant GapDetector
    participant GoalEvaluator
    participant Context

    Orchestrator->>GoalEvaluator: evaluateGoals()
    GoalEvaluator->>Context: getGoals()
    Context-->>GoalEvaluator: Goal[]
    GoalEvaluator-->>Orchestrator: GoalResult[]
    Orchestrator->>GapDetector: detectEpicGaps(results)
    GapDetector->>Context: analyzeState()
    Context-->>GapDetector: State
    GapDetector-->>Orchestrator: Gap[]
```

### 3. Task Execution

```mermaid
sequenceDiagram
    participant Executor
    participant Registry
    participant Context
    participant Hooks
    participant Journal

    Executor->>Registry: getTask(type)
    Registry-->>Executor: TaskFn
    Executor->>Hooks: fire('task:start')
    Executor->>Context: createTaskContext()
    Executor->>Executor: TaskFn(context)
    Executor->>Registry: getChecks(type)
    loop Each Check
        Executor->>Executor: check.run()
        Executor->>Journal: TASK_CHECK
    end
    Executor->>Hooks: fire('task:complete')
    Executor-->>Orchestrator: ExecutionResult
```

## Data Models

### ProjectConfig
```typescript
interface ProjectConfig {
  id: string;
  title?: string;
  goals: Goal[];
  variables?: Record<string, string>;
  plugins?: PluginManifest[];
  ai?: AIProviderConfig;
  epicDefaults?: Partial<EpicConfig>;
}
```

### Gap
```typescript
interface Gap {
  id: string;
  type: 'structural' | 'semantic' | 'quality' | 'integration';
  level: 'project' | 'epic' | 'task';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resolved: boolean;
  timestamp: number;
  relatedGoals?: string[];
}
```

### TaskConfig
```typescript
interface TaskConfig {
  id: string;
  title: string;
  type: string;
  inputs?: TaskInput[];
  outputs?: TaskOutput[];
  checks?: CheckConfig[];
  retries?: number;
  timeout?: number;
}
```

### ExecutionResult
```typescript
interface ExecutionResult {
  taskId: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
  checkResults?: CheckResult[];
  attempts: number;
}
```

## State Transitions

### Task State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: task created
    pending --> running: task:start hook
    running --> succeeded: all checks pass
    running --> failed: check fails
    running --> retry: retryable error
    retry --> running: retry attempt
    failed --> [*]
    succeeded --> [*]
```

### Epic State Machine

```mermaid
stateDiagram-v2
    [*] --> running: epic starts
    running --> waiting: all tasks planned
    waiting --> running: tasks available
    running --> converged: all goals satisfied
    running --> stalled: no progress 2x
    converged --> [*]
    stalled --> [*]
```

## Journal Event Flow

```mermaid
flowchart LR
    subgraph Writers
        E1[TaskExecutor]
        E2[GapDetector]
        E3[GoalEvaluator]
        E4[HookRegistry]
    end

    subgraph Journal
        EW[EventWriter]
        EL[EventLog]
        ET[ExecutionTrace]
    end

    E1 -->|TASK_START| EW
    E1 -->|TASK_COMPLETE| EW
    E1 -->|TASK_FAILED| EW
    E2 -->|GAP_DETECTED| EW
    E2 -->|GAP_RESOLVED| EW
    E3 -->|GOAL_EVALUATED| EW
    E4 -->|HOOK_FIRED| EW

    EW --> EL
    EW --> ET
```

## Checkpoint Data

Minimal checkpoint state for crash recovery:

```typescript
interface Checkpoint {
  epicId: string;
  cursor: string;          // Current position in task tree
  executionContext: {
    completedTasks: string[];
    pendingTasks: string[];
    currentTask?: string;
  };
  gapState: {
    resolvedGaps: string[];
    pendingGaps: string[];
  };
  timestamp: number;
}
```

## Storage Read/Write Flow

```mermaid
flowchart TD
    subgraph Reads
        RC[Read Config] --> RP[Read Project YAML]
        RC --> RE[Read Epic YAML]
        RC --> RT[Read Task YAML]
    end

    subgraph Writes
        WS[Write Status] --> WT[Write Task Status]
        WS --> WE[Write Epic Status]
        WJ[Write Journal] --> WJE[Write Journal Entry]
        WC[Write Checkpoint] --> WCF[Write Checkpoint File]
    end
```
