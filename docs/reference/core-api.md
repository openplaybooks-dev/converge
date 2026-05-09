---
title: "@converge/core"
description: "Public API surface of @converge/core for programmatic use."
sidebar:
  order: 5
---
This page is for framework integrators, tooling authors, and extension developers. CLI users interact with converge through the [`converge` CLI](../cli/index.md) and do not need this page.

## Package exports map

The package exposes these subpaths via `package.json#exports`:

| Subpath | Purpose | Stability |
|---|---|---|
| `@converge/core` | Primary entry: everything | Pre-1.0 |
| `@converge/core/planner` | Planner-only bundle | Pre-1.0 |
| `@converge/core/client` | Client-only bundle | Pre-1.0 |
| `@converge/core/studio-api` | Studio-facing surface | Pre-1.0 |
| `@converge/core/*` | Internal subpaths | Unstable |

Pin to an exact version in production. Minor breaking changes occur between minor releases until 1.0.

## Top-level exports

### Definition builders

- `taskDef()`: Define a task with id, title, outputs, executor, checks, and plan. The primary way to create reusable task units.
- `defineProject()`: Define a project with a hierarchical task tree and convergence targets.
- `loadPlaybook()`: Load and parse a playbook YAML file at runtime.

### Runtime

- `createRuntime()`: Instantiate the runtime executor with project context and storage.
- `Runtime`: The runtime interface; exposes `executeTask()`, `executeProject()`, and lifecycle hooks.
- `TaskManager`: Manages task execution state, checkpoints, and retry logic.
- `ProjectManager`: Manages project-level state, state tracking, and convergence orchestration.

### Convergence

- `ConvergenceConfig`: Configuration for the convergence orchestrator (convergence tolerance, max iterations, etc.).
- `ConvergenceOrchestrator`: Orchestrates convergence-driven execution loops with gap detection.
- `Gap` / `GapDetector`: Represents a divergence between current state and desired state; detector finds and categorizes gaps.

### Hooks & registries

- `HookRegistry`: Register and fire lifecycle hooks (beforeTask, afterTask, onCheckFail, etc.).
- `CheckFn` / `EvalFn` / `PlanFn` / `TaskFn`: Function signature types for check, evaluation, planning, and execution hooks.

### Discovery

- `DiscoveryScanner`: Glob-based auto-discovery of `.md` task files, `.yml` playbooks, and `PROJECT.md` from the filesystem.

## Code example

```typescript
import { defineProject, taskDef, createRuntime } from '@converge/core';

const analyzeTask = taskDef({
  id: 'analyze',
  title: 'Analyze project',
  outputs: ['analysis.md'],
  executor: async (ctx) => {
    ctx.log.info('Running analysis...');
    await ctx.fs.write('analysis.md', '# Analysis\n\nDone.');
  },
});

const project = defineProject({
  tasks: [analyzeTask],
  converge: { convergeThreshold: 0.9 },
});

const runtime = createRuntime({ dir: process.cwd() });
await runtime.executeProject(project);
```

## Stability

**This API is pre-1.0.** Expect minor breaking changes between minor versions (e.g., `0.1.x` → `0.2.x`). Pin to an exact version for production use. The CLI surface is more stable than the programmatic API.
