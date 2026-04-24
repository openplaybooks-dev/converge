# API Reference

## Main Export (`packages/core/src/index.ts`)

Converge provides a unified API through its main export. The primary entry point is the **Runtime** system.

## Core Types

### ConvergeConfig
```typescript
interface ConvergeConfig {
  project: ProjectConfig;
  discovery?: DiscoveryConfig;
  runtime?: RuntimeConfig;
  ai?: AIConfig;
}
```

### Runtime
```typescript
interface Runtime {
  goalManager: GoalManager;
  taskManager: TaskManager;
  epicManager: EpicManager;
  projectManager: ProjectManager;
}
```

## Builder API

### Project Builder
```typescript
import { project, defineProject } from '@converge/core';

const myProject = defineProject({
  id: 'my-project',
  goals: [
    goal('goal-1', 'Description'),
  ],
  variables: {
    OUTPUT_DIR: './dist',
  },
});
```

### Epic Builder
```typescript
import { epic, defineEpic } from '@converge/core';

const myEpic = defineEpic({
  id: 'my-epic',
  title: 'My Epic',
  goals: [
    goal('epic-goal-1', 'Epic-level goal'),
  ],
});
```

### Task Definition
```typescript
import { taskDef } from '@converge/core';

const myTask = taskDef({
  id: 'my-task',
  title: 'My Task',
  type: 'implementation',
  inputs: [
    { name: 'input1', description: '...' },
  ],
  checks: [
    { name: 'check-1', command: 'grep -r "expected" src/' },
  ],
});
```

## Function Registry API

### Registration
```typescript
import { registerTask, registerCheck, registerEval, registerPlan } from '@converge/core';

// Register a task function
registerTask('implementation', async (context) => {
  // Implementation
  return { success: true };
});

// Register a check function
registerCheck('typescript', async (context) => {
  const result = await context.shell.exec('npx tsc --noEmit');
  return { passed: result.exitCode === 0 };
});

// Register an evaluation function
registerEval('goal-evaluated', async (context, goal) => {
  // Check if goal is satisfied
  return { satisfied: true };
});

// Register a planning function
registerPlan('generate-tasks', async (context, gaps) => {
  return [{ id: 'task-1', title: 'Generated task' }];
});
```

### Lookup
```typescript
import { getTask, getCheck, getEval, getPlan, listFunctions } from '@converge/core';

const taskFn = getTask('implementation');
const checkFn = getCheck('typescript');
const evalFn = getEval('goal-evaluated');
const planFn = getPlan('generate-tasks');

// List all registered functions
const functions = listFunctions();
```

## Context API

### ProjectContext
```typescript
interface ProjectContext {
  // Filesystem
  fs: FileSystemAPI;

  // Shell execution
  shell: ShellAPI;

  // Git operations
  git: GitAPI;

  // Logging
  log: LoggerAPI;

  // AI evaluation
  eval: EvalAPI;

  // AI planning
  plan: PlanAPI;

  // Check API
  check: CheckAPI;
}
```

### TaskContext (extends ProjectContext)
```typescript
interface TaskContext extends ProjectContext {
  task: {
    id: string;
    title: string;
    type: string;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
  };
  epic: {
    id: string;
    title: string;
  };
}
```

### ShellAPI
```typescript
interface ShellAPI {
  exec(command: string, options?: ShellExecOptions): Promise<ShellResult>;
  spawn(command: string, args: string[], options?: ShellExecOptions): Promise<ShellResult>;
}

interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

## Orchestrator API

### Convergence Orchestrator
```typescript
import { ConvergenceOrchestrator, createConvergenceOrchestrator } from '@converge/core';

const orchestrator = createConvergenceOrchestrator(runtime, config);

const result = await orchestrator.runEpicConvergence(epicId);
```

### Project Orchestrator
```typescript
import { createProjectOrchestratorV2 } from '@converge/core';

const orchestrator = createProjectOrchestratorV2(runtime, config);
const result = await orchestrator.run();
```

## Gap API

### Gap Detection
```typescript
import { GapDetector, createGapDetector } from '@converge/core';

const detector = createGapDetector(config);
const gaps = await detector.detectEpicGaps(epicId);
```

### Gap Utilities
```typescript
import { createGap, filterByType, filterBySeverity, prioritizeGaps } from '@converge/core';

const gap = createGap({
  type: 'structural',
  level: 'task',
  description: 'Missing implementation',
  severity: 'high',
});

const criticalGaps = filterBySeverity(gaps, ['critical']);
const prioritized = prioritizeGaps(gaps);
```

## Hooks API

### Registration
```typescript
import { globalHookRegistry } from '@converge/core';

globalHookRegistry.register('task:start', async (payload) => {
  console.log('Task started:', payload.taskId);
});

globalHookRegistry.register('task:complete', async (payload) => {
  console.log('Task completed:', payload.taskId);
}, { priority: 10 });
```

### Available Hooks
```typescript
type HookEvent =
  | 'project:start'
  | 'project:complete'
  | 'epic:start'
  | 'epic:complete'
  | 'task:start'
  | 'task:complete'
  | 'task:failed'
  | 'task:retry'
  | 'goal:satisfied'
  | 'goal:unsatisfied'
  | 'gap:detected'
  | 'gap:resolved';
```

## Planner API

### Dynamic Planner
```typescript
import { DynamicPlanner, createDynamicPlanner } from '@converge/core';

const planner = createDynamicPlanner(config);
const plan = await planner.generatePlan(context, goals);
```

### Task Scanner
```typescript
import { TaskFileScanner, createTaskFileScanner } from '@converge/core';

const scanner = createTaskFileScanner(config);
const tasks = await scanner.scan(directory);
```

## Executor API

### Function Executor
```typescript
import { FunctionExecutor, createFunctionExecutor } from '@converge/core';

const executor = createFunctionExecutor({
  registry: globalRegistry,
  hooks: globalHookRegistry,
  maxRetries: 3,
});

const result = await executor.execute(taskConfig, context);
```

### Batch Executor
```typescript
import { BatchExecutor, createBatchExecutor } from '@converge/core';

const batchExecutor = createBatchExecutor({
  executor: fnExecutor,
  maxParallel: 5,
});

const results = await batchExecutor.executeBatch(taskConfigs, context);
```

## Storage API

### Filesystem Storage
```typescript
import { FilesystemStorage, createFilesystemStorage } from '@converge/core';

const storage = createFilesystemStorage(projectRoot);
await storage.writeProjectConfig(config);
await storage.writeEpicConfig(epicId, config);
await storage.writeTaskConfig(epicId, taskId, config);
```

## Checkpoint API

### Resumability Manager
```typescript
import { ResumabilityManager, createResumabilityManager } from '@converge/core';

const manager = createResumabilityManager(config);
await manager.checkpoint(epicId, state);
const resumePoint = await manager.getResumePoint(epicId);
```

## Plugin API

### Plugin Manifest
```typescript
interface ConvergePluginV2 {
  name: string;
  version: string;
  hooks: ConvergeHooks;
  functions?: {
    checks?: Record<string, CheckFn>;
    evals?: Record<string, EvalFn>;
    plans?: Record<string, PlanFn>;
    tasks?: Record<string, TaskFn>;
  };
}
```

### Loading Plugins
```typescript
import { loadPluginsV2 } from '@converge/core';

const plugins = await loadPluginsV2(['./plugins/my-plugin'], registry);
```
