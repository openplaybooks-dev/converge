# @converge/core

**Core library for Converge** — A gap-driven framework for building deterministic, reproducible AI workflows.

This package provides the programmatic API for building and orchestrating AI agent workflows. For the CLI, see the [CLI documentation](#cli-usage).

---

## Installation

```bash
npm install @converge/core
```

---

## Usage

### As a Library

Use `@converge/core` programmatically to build custom AI workflows:

```typescript
import { 
  createRuntime, 
  taskDef, 
  project,
  createConvergenceOrchestrator 
} from '@converge/core';

// Define a task programmatically
const myTask = taskDef({
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
    // Your task logic here
    await ctx.fs.writeFile('analysis.md', '# Analysis\n...');
  }
});

// Create and run
const runtime = createRuntime({ dir: process.cwd() });
await runtime.executeTask(myTask);
```

### Define Projects

```typescript
import { project, taskDef } from '@converge/core';

const myProject = project({
  name: 'my-app',
  description: 'Build an app',
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
    })
  ]
});
```

### Use the Client SDK

For Seed scripts and external integrations:

```typescript
import { createClient } from '@converge/core/client';

const client = createClient();

// Spawn child tasks dynamically
await client.spawn({
  id: '001-feature-a',
  title: 'Build Feature A',
  outputs: ['src/features/a.ts']
});
```

---

## CLI Usage

The CLI is bundled with `@converge/core` and provides commands for running workflows:

```bash
# Install globally
npm install -g @converge/core

# Run workflows
converge run
converge status
converge verify
```

See the [main README](../../README.md) for full CLI documentation.

---

## Package Exports

### Main Library (`@converge/core`)

The core programmatic API:

```typescript
import { 
  // Configuration
  loadConvergeConfig,
  resolveConvergeConfig,
  validateConvergeConfig,
  
  // Task Definition
  taskDef,
  project,
  check,
  plan,
  
  // Runtime
  createRuntime,
  createProjectOrchestrator,
  createConvergenceOrchestrator,
  
  // Storage
  createFilesystemStorage,
  createStatusManager,
  
  // Gap Detection
  createGapDetector,
  createConvergenceAnalyzer,
  
  // Hooks
  HookRegistry,
  globalHookRegistry,
  
  // Discovery
  createDiscoveryScanner,
  createDiscoveryWatcher,
  
  // AI
  createAIFactory,
  createProjectAI,
  
  // Types
  type ConvergeConfig,
  type TaskDefinition,
  type ProjectDefinition,
  type Gap,
  type CheckResult,
  // ... and many more
} from '@converge/core';
```

### Client SDK (`@converge/core/client`)

Minimal interface for Seed scripts:

```typescript
import { createClient } from '@converge/core/client';
```

---

## Architecture

Converge operates at three layers:

1. **Project Orchestration** — Scans playbooks, builds task queues, drives execution
2. **Task Execution** — Manages attempts, checkpoints, and retry logic
3. **Attempt Execution** — Runs AI agents with context, verification, and self-correction

### Key Concepts

- **Gap-Driven**: Continuously evaluate current vs. target state
- **Convergent**: Automatic checkpointing, resumption, and self-correction
- **Markdown-First**: Tasks are TASK.md files with YAML frontmatter
- **Hierarchical**: Filesystem structure defines execution order

---

## Core Features

### Task Definition

```typescript
import { taskDef } from '@converge/core';

const task = taskDef({
  id: 'build-feature',
  title: 'Build Feature X',
  inputs: ['spec.md'],
  outputs: ['src/feature-x.ts', 'tests/feature-x.test.ts'],
  checks: [
    {
      id: 'types-compile',
      cmd: 'tsc --noEmit',
      description: 'TypeScript compiles'
    },
    {
      id: 'tests-pass',
      cmd: 'npm test',
      description: 'Tests pass'
    }
  ],
  executor: async (ctx) => {
    // Implementation
  }
});
```

### Gap Detection

```typescript
import { createGapDetector } from '@converge/core';

const detector = createGapDetector({
  projectDir: process.cwd()
});

const gaps = await detector.detectGaps();
console.log(`Found ${gaps.length} gaps`);
```

### Hooks

```typescript
import { HookRegistry } from '@converge/core';

const hooks = new HookRegistry();

hooks.on('task:start', async (payload) => {
  console.log(`Starting task: ${payload.taskId}`);
});

hooks.on('task:complete', async (payload) => {
  console.log(`Completed task: ${payload.taskId}`);
});
```

### Discovery

```typescript
import { createDiscoveryScanner } from '@converge/core';

const scanner = createDiscoveryScanner({
  projectDir: process.cwd(),
  patterns: ['tasks/**/*.md', 'goals/**/*.md']
});

const discovered = await scanner.scan();
console.log(`Found ${discovered.tasks.length} tasks`);
```

---

## Bundle Sizes

- **Core Library**: 1.8MB (programmatic API only)
- **CLI**: 2.1MB (includes all commands)
- **Client SDK**: 3.4KB (minimal Seed interface)

When you import from `@converge/core`, you get only the library code without CLI bloat.

---

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type { 
  TaskDefinition,
  ProjectDefinition,
  ConvergeConfig,
  Gap,
  CheckResult,
  ExecutionResult
} from '@converge/core';
```

---

## Examples

See the [examples directory](../../examples/) for complete working examples:

- **game-assets** — Dynamic asset generation pipeline
- **evolutionary-optimization** — Multi-generation optimization
- **frontier-research** — Research workflow automation

---

## Documentation

- [Getting Started](../../docs/getting-started.md)
- [Task Definition](../../docs/scaffolding.md)
- [CLI Reference](../../docs/cli/)
- [API Reference](../../docs/api/)

---

## License

MIT

---

**Gap-driven. Convergent. Markdown-first.**

_Build AI workflows that actually finish._
