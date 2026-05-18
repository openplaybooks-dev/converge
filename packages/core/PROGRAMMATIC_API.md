# Programmatic API Guide

This guide shows how to use `@openplaybooks/converge-core` as a library to build custom AI workflows programmatically.

## Installation

```bash
npm install @openplaybooks/converge-core
```

## Quick Start

```typescript
import { taskDef, createRuntime } from '@openplaybooks/converge-core';

// Define a task
const task = taskDef({
  id: 'analyze-code',
  title: 'Analyze codebase',
  outputs: ['analysis.md'],
  checks: [
    {
      id: 'analysis-exists',
      cmd: 'test -f analysis.md',
      description: 'Analysis file created'
    }
  ],
  executor: async (ctx) => {
    // Your task logic
    const files = await ctx.fs.readdir('src');
    const analysis = `# Analysis\n\nFound ${files.length} files`;
    await ctx.fs.writeFile('analysis.md', analysis);
  }
});

// Execute
const runtime = createRuntime({ dir: process.cwd() });
await runtime.executeTask(task);
```

## Core Concepts

### Task Definition

Tasks are the fundamental unit of work:

```typescript
import { taskDef } from '@openplaybooks/converge-core';

const task = taskDef({
  id: 'build-feature',
  title: 'Build Feature X',
  
  // Inputs this task needs
  inputs: ['spec.md', 'design/*.png'],
  
  // Outputs this task produces
  outputs: ['src/feature-x.ts', 'tests/feature-x.test.ts'],
  
  // Dependencies (other task IDs)
  dependencies: ['01-setup'],
  
  // Verification checks
  checks: [
    {
      id: 'types-compile',
      cmd: 'tsc --noEmit',
      description: 'TypeScript compiles'
    },
    {
      id: 'tests-pass',
      cmd: 'npm test feature-x',
      description: 'Tests pass'
    }
  ],
  
  // Execution logic
  executor: async (ctx) => {
    // Access filesystem
    const spec = await ctx.fs.readFile('spec.md', 'utf-8');
    
    // Run shell commands
    const result = await ctx.shell.exec('npm run build');
    
    // Log progress
    ctx.logger.info('Building feature...');
    
    // Write outputs
    await ctx.fs.writeFile('src/feature-x.ts', code);
  }
});
```

### Project Definition

Group tasks into projects:

```typescript
import { project, taskDef } from '@openplaybooks/converge-core';

const myProject = project({
  name: 'my-app',
  description: 'Build an application',
  
  tasks: [
    taskDef({
      id: '01-setup',
      title: 'Setup project',
      outputs: ['package.json'],
      executor: async (ctx) => {
        // Setup logic
      }
    }),
    
    taskDef({
      id: '02-build',
      title: 'Build app',
      dependencies: ['01-setup'],
      executor: async (ctx) => {
        // Build logic
      }
    }),
    
    taskDef({
      id: '03-test',
      title: 'Run tests',
      dependencies: ['02-build'],
      executor: async (ctx) => {
        // Test logic
      }
    })
  ]
});
```

### Runtime & Execution

Execute tasks with the runtime:

```typescript
import { createRuntime } from '@openplaybooks/converge-core';

const runtime = createRuntime({
  dir: process.cwd(),
  maxIterations: 100
});

// Execute single task
await runtime.executeTask(task);

// Execute project
await runtime.executeProject(myProject);

// Execute with options
await runtime.executeTask(task, {
  force: true,      // Force re-run
  resume: true,     // Resume from checkpoint
  maxAttempts: 3    // Max retry attempts
});
```

### Context API

Tasks receive a context object with utilities:

```typescript
executor: async (ctx) => {
  // Filesystem operations
  await ctx.fs.writeFile('output.txt', 'content');
  const content = await ctx.fs.readFile('input.txt', 'utf-8');
  const files = await ctx.fs.readdir('src');
  const exists = await ctx.fs.exists('file.txt');
  
  // Shell commands
  const result = await ctx.shell.exec('npm test');
  console.log(result.stdout);
  
  // Logging
  ctx.logger.info('Processing...');
  ctx.logger.error('Failed!');
  ctx.logger.debug('Details...');
  
  // Git operations
  const status = await ctx.git.status();
  await ctx.git.commit('Update files');
  
  // Task metadata
  console.log(ctx.taskId);
  console.log(ctx.attemptNumber);
  console.log(ctx.projectDir);
}
```

### Hooks

React to workflow events:

```typescript
import { HookRegistry } from '@openplaybooks/converge-core';

const hooks = new HookRegistry();

// Task lifecycle
hooks.on('task:start', async (payload) => {
  console.log(`Starting: ${payload.taskId}`);
});

hooks.on('task:complete', async (payload) => {
  console.log(`Completed: ${payload.taskId}`);
});

hooks.on('task:fail', async (payload) => {
  console.log(`Failed: ${payload.taskId}`);
  console.log(`Error: ${payload.error}`);
});

// Check events
hooks.on('check:pass', async (payload) => {
  console.log(`Check passed: ${payload.checkId}`);
});

hooks.on('check:fail', async (payload) => {
  console.log(`Check failed: ${payload.checkId}`);
});

// Project events
hooks.on('project:start', async (payload) => {
  console.log(`Project started: ${payload.projectId}`);
});

hooks.on('project:complete', async (payload) => {
  console.log(`Project completed: ${payload.projectId}`);
});

// Use hooks with runtime
const runtime = createRuntime({
  dir: process.cwd(),
  hooks
});
```

### Gap Detection

Detect gaps between current and target state:

```typescript
import { createGapDetector } from '@openplaybooks/converge-core';

const detector = createGapDetector({
  projectDir: process.cwd()
});

// Detect all gaps
const gaps = await detector.detectGaps();

for (const gap of gaps) {
  console.log(`Gap: ${gap.type}`);
  console.log(`Severity: ${gap.severity}`);
  console.log(`Description: ${gap.description}`);
  console.log(`Suggested fix: ${gap.suggestedFix}`);
}

// Filter gaps
const criticalGaps = gaps.filter(g => g.severity === 'critical');
const missingOutputs = gaps.filter(g => g.type === 'missing-output');
```

### Discovery

Auto-discover tasks from filesystem:

```typescript
import { createDiscoveryScanner } from '@openplaybooks/converge-core';

const scanner = createDiscoveryScanner({
  projectDir: process.cwd(),
  patterns: [
    'tasks/**/*.md',
    'goals/**/*.md'
  ]
});

const discovered = await scanner.scan();

console.log(`Found ${discovered.tasks.length} tasks`);
console.log(`Found ${discovered.goals.length} goals`);

// Access discovered tasks
for (const task of discovered.tasks) {
  console.log(`Task: ${task.id} - ${task.title}`);
  console.log(`Path: ${task.path}`);
}
```

### Storage

Manage task state and checkpoints:

```typescript
import { createFilesystemStorage, createStatusManager } from '@openplaybooks/converge-core';

// Filesystem storage
const storage = createFilesystemStorage({
  projectDir: process.cwd()
});

await storage.writeTaskConfig(taskId, config);
const config = await storage.readTaskConfig(taskId);

// Status management
const statusManager = createStatusManager({
  projectDir: process.cwd()
});

await statusManager.markComplete(taskId);
await statusManager.markFailed(taskId, error);
const status = await statusManager.getStatus(taskId);
```

### AI Integration

Use AI providers:

```typescript
import { createAIFactory, createProjectAI } from '@openplaybooks/converge-core';

// Create AI factory
const aiFactory = createAIFactory({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Create project-specific AI
const ai = createProjectAI({
  projectDir: process.cwd(),
  config: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022'
  }
});

// Use in tasks
executor: async (ctx) => {
  const response = await ctx.ai.generate({
    prompt: 'Analyze this code...',
    context: { files: ['src/app.ts'] }
  });
  
  console.log(response.content);
}
```

## Advanced Usage

### Custom Orchestrators

Build custom orchestration logic:

```typescript
import { createConvergenceOrchestrator } from '@openplaybooks/converge-core';

const orchestrator = createConvergenceOrchestrator({
  projectDir: process.cwd(),
  config: {
    maxIterations: 100,
    convergenceThreshold: 0.95
  }
});

const result = await orchestrator.run();
console.log(`Converged: ${result.converged}`);
console.log(`Iterations: ${result.iterations}`);
```

### Dynamic Task Spawning

Spawn tasks at runtime:

```typescript
import { createClient } from '@openplaybooks/converge-core/client';

const client = createClient();

// Spawn child tasks
for (const feature of features) {
  await client.spawn({
    id: `build-${feature.id}`,
    title: `Build ${feature.name}`,
    outputs: [`src/features/${feature.id}.ts`],
    dependencies: ['setup']
  });
}
```

### Custom Checks

Define programmatic checks:

```typescript
const task = taskDef({
  id: 'validate-data',
  title: 'Validate data',
  checks: [
    {
      id: 'row-count',
      fn: async (ctx) => {
        const data = await ctx.fs.readFile('data.json', 'utf-8');
        const rows = JSON.parse(data);
        return rows.length >= 100;
      },
      description: 'At least 100 rows'
    }
  ],
  executor: async (ctx) => {
    // Generate data
  }
});
```

## TypeScript Support

Full type definitions included:

```typescript
import type {
  TaskDefinition,
  ProjectDefinition,
  ConvergeConfig,
  Gap,
  CheckResult,
  ExecutionResult,
  TaskContext,
  HookPayloads
} from '@openplaybooks/converge-core';

// Type-safe task definition
const task: TaskDefinition = {
  id: 'my-task',
  title: 'My Task',
  executor: async (ctx: TaskContext) => {
    // Fully typed context
  }
};
```

## Examples

See the [examples directory](../../examples/) for complete working examples:

- **game-assets** — Dynamic asset generation
- **evolutionary-optimization** — Multi-generation optimization
- **frontier-research** — Research automation

## See Also

- [CLI Documentation](./CLI.md)
- [Getting Started](../../docs/getting-started.md)
- [Task Definition](../../docs/scaffolding.md)
