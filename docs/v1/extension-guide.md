# Extension Guide

## Adding a New AI Provider

### 1. Create Provider Package

Create `packages/{providername}fn/` with:

```
packages/
└── myproviderfn/
    ├── src/
    │   ├── index.ts         # Exports
    │   ├── myprovider.ts    # Provider implementation
    │   └── types.ts         # Type definitions
    ├── tests/
    │   └── myprovider.test.ts
    └── package.json
```

### 2. Implement AICaller Interface

```typescript
// packages/myproviderfn/src/myprovider.ts
import type { AICaller, AIResponse } from '@converge/core';

export class MyProviderCaller implements AICaller {
  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'default-model';
  }

  async complete(prompt: string): Promise<AIResponse> {
    // Implement API call
    const response = await this.callMyProviderAPI(prompt);
    return {
      content: response.text,
      usage: response.usage,
    };
  }

  async *stream(prompt: string): AsyncGenerator<AIResponse> {
    // Implement streaming
    const stream = await this.callMyProviderAPIStream(prompt);
    for await (const chunk of stream) {
      yield { content: chunk.text, partial: true };
    }
  }
}
```

### 3. Register in Factory

Update `packages/core/src/ai/factory.ts`:

```typescript
import { MyProviderCaller } from 'myproviderfn';

export function createAIFactory() {
  const factories = {
    myprovider: (config) => new MyProviderCaller(config.apiKey),
    // ...
  };
}
```

## Adding a New Check Type

### 1. Register Check Function

```typescript
// In your plugin or task definition
import { registerCheck } from '@converge/core';

registerCheck('my-check-type', async (context, config) => {
  const result = await context.shell.exec(config.command);
  return {
    passed: result.exitCode === 0,
    output: result.stdout,
    error: result.stderr,
  };
});
```

### 2. Use in Task Config

```yaml
# .converge/epics/my-epic/tasks/my-task/task.yaml
id: my-task
title: My Task
type: implementation
checks:
  - name: my-custom-check
    type: my-check-type
    config:
      command: npm run my-validation
```

## Adding a New Hook

### 1. Define Hook Type

In `packages/core/src/hooks/types.ts`:

```typescript
export interface CustomHookPayloads {
  // ... existing hooks
  'custom:event': CustomHookPayload;
}

export interface CustomHookPayload {
  timestamp: number;
  data: CustomData;
}
```

### 2. Fire Hook

```typescript
// In your module
import { globalHookRegistry } from '@converge/core';

await globalHookRegistry.fire('custom:event', {
  timestamp: Date.now(),
  data: myData,
});
```

## Adding a New Gap Type

### 1. Extend GapType Union

In `packages/core/src/gap/types.ts`:

```typescript
export type GapType = 'structural' | 'semantic' | 'quality' | 'integration' | 'custom';
```

### 2. Implement Detection

In `packages/core/src/gap/detector.ts`:

```typescript
async detectCustomGaps(context: EpicContext): Promise<Gap[]> {
  // Custom gap detection logic
  return [];
}
```

## Adding a New Storage Backend

### 1. Implement Storage Interface

```typescript
// packages/core/src/storage/base.ts
export interface StorageBackend {
  readProjectConfig(): Promise<ProjectConfig>;
  writeProjectConfig(config: ProjectConfig): Promise<void>;
  readEpicConfig(epicId: string): Promise<EpicConfig>;
  writeEpicConfig(epicId: string, config: EpicConfig): Promise<void>;
  readTaskConfig(epicId: string, taskId: string): Promise<TaskConfig>;
  writeTaskConfig(epicId: string, taskId: string, config: TaskConfig): Promise<void>;
  // ... other methods
}
```

### 2. Create Implementation

```typescript
// packages/core/src/storage/s3.ts
export class S3Storage implements StorageBackend {
  constructor(bucket: string, prefix: string) {
    this.bucket = bucket;
    this.prefix = prefix;
  }

  async readProjectConfig(): Promise<ProjectConfig> {
    const data = await this.s3.getObject(this.bucket, `${this.prefix}/project.yaml`);
    return parseYaml(data);
  }
  // ... implement all interface methods
}
```

### 3. Export from Factory

```typescript
// packages/core/src/storage/index.ts
export function createStorage(type: 'filesystem' | 's3', config: StorageConfig): StorageBackend {
  switch (type) {
    case 'filesystem': return new FilesystemStorage(config.root);
    case 's3': return new S3Storage(config.bucket, config.prefix);
  }
}
```

## Adding a New Orchestration Strategy

### 1. Implement Strategy Interface

```typescript
// packages/core/src/planning/strategies/my-strategy.ts
import type { PlanningStrategy } from '@converge/core';

export class MyStrategy implements PlanningStrategy {
  async generateTasks(
    context: EpicContext,
    gaps: Gap[],
    goals: Goal[]
  ): Promise<TaskConfig[]> {
    // Custom task generation logic
    return tasks;
  }
}
```

### 2. Register in Convergence Orchestrator

```typescript
// packages/core/src/orchestrator/convergence.ts
const strategies = {
  default: DefaultPlanningStrategy,
  my-strategy: MyStrategy,
};

export function createConvergenceOrchestrator(
  runtime: Runtime,
  config: ConvergenceConfig
) {
  const strategy = new strategies[config.strategy || 'default']();
  return new ConvergenceOrchestrator(runtime, strategy, config);
}
```

## Adding a New Function Type

### 1. Define Function Type

In `packages/core/src/functions/types.ts`:

```typescript
export interface TransformFn {
  (input: unknown, context: TaskContext): Promise<unknown>;
}

export interface TransformFnMeta {
  name: string;
  description?: string;
  inputType?: z.ZodType;
  outputType?: z.ZodType;
}
```

### 2. Add to Registry

In `packages/core/src/functions/registry.ts`:

```typescript
export class FunctionRegistry {
  private transforms = new Map<string, TransformFn>();

  registerTransform(meta: TransformFnMeta, fn: TransformFn): void {
    this.transforms.set(meta.name, fn);
  }

  getTransform(name: string): TransformFn | undefined {
    return this.transforms.get(name);
  }
}
```

### 3. Export from Index

In `packages/core/src/index.ts`:

```typescript
export { FunctionRegistry } from './functions/registry';
export type { TransformFn, TransformFnMeta } from './functions/types';
```

## Adding a New Task Type

### 1. Define Task Definition

```typescript
// In config/task-types.ts
export const MY_TASK_TYPE = 'my-type';

export const MyTaskDefinition = taskDef({
  type: MY_TASK_TYPE,
  title: 'My Task',
  inputs: [
    { name: 'input1', description: '...', required: true },
  ],
  checks: [
    { name: 'default-check', command: 'echo "No default check"' },
  ],
});
```

### 2. Register Task Function

```typescript
// In your plugin or setup
registerTask(MY_TASK_TYPE, async (context) => {
  // Implementation
  const input = context.task.inputs.input1;
  // ... do work
  return { success: true };
});
```

### 3. Add Validation Rules

In `packages/core/src/validation/rules/`:

```typescript
// my-task-rules.ts
export const myTaskRules: ValidationRule[] = [
  {
    name: 'my-task-has-input',
    severity: 'error',
    validate: (task) => {
      return task.inputs?.input1 != null;
    },
  },
];
```

## Best Practices for Extensions

1. **Follow Existing Patterns**: Match the style and structure of existing code
2. **Add Tests**: Unit tests for new functionality
3. **Update Index**: Export new types/functions from main index
4. **Document**: Add JSDoc comments to all public APIs
5. **Type Safety**: Use Zod for runtime validation of config
6. **Error Handling**: Graceful degradation when optional dependencies missing
7. **Hook Integration**: Fire hooks for lifecycle events where appropriate
