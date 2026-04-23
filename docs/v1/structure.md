# Structure Guide

## Directory Layout

```
converge/
├── packages/                    # All packages (monorepo workspace)
│   ├── core/                   # Main Converge framework
│   │   ├── src/
│   │   │   ├── agent-manager/  # Agent lifecycle, diagnostics, cleanup
│   │   │   ├── ai/             # AI factory, context, provider abstraction
│   │   │   ├── artifacts/      # Artifact handling
│   │   │   ├── auto-verify/    # AutoConverge synthesis/refinement
│   │   │   ├── checkpoint/      # Resumability & persistence
│   │   │   ├── cli/            # CLI commands (run, reset, journal, etc.)
│   │   │   ├── client/         # Converge client
│   │   │   ├── config/         # Task/project config parsing & validation
│   │   │   ├── context/        # Immutable context hierarchy
│   │   │   ├── converge/       # Converge runner, gap ledger, weights
│   │   │   ├── discovery/      # Skill graph, file discovery, watchers
│   │   │   ├── executor/       # Task/function execution engine
│   │   │   ├── facts/          # Fact gathering API
│   │   │   ├── functions/      # Function registry (CheckFn, EvalFn, etc.)
│   │   │   ├── gap/            # Gap detection & analysis
│   │   │   ├── goal/           # Goal hierarchy & satisfaction
│   │   │   ├── hooks/          # Lifecycle hook registry
│   │   │   ├── journal/        # Event logging & tracing
│   │   │   ├── meta/           # Meta-optimization (self-improvement)
│   │   │   ├── metrics/        # Benchmarking & metrics extraction
│   │   │   ├── orchestrator/   # Convergence orchestrator
│   │   │   ├── planning/        # Task file scanner, generator, replan
│   │   │   ├── playbook/       # Playbook execution & journal
│   │   │   ├── plugins/        # Plugin loader & manifest
│   │   │   ├── repair/         # Self-correction strategies
│   │   │   ├── resume/         # Resumability manager
│   │   │   ├── runtime/        # Runtime interfaces (GoalManager, etc.)
│   │   │   ├── storage/        # Filesystem storage abstraction
│   │   │   ├── subtasks/       # Subtask generation
│   │   │   ├── tree/           # Task tree data structure
│   │   │   ├── unit/           # Unit system (V2)
│   │   │   ├── validation/     # Task/project validation rules
│   │   │   ├── yields/         # Yields processor & spawner
│   │   │   ├── cli/            # CLI commands
│   │   │   └── index.ts        # Main export
│   │   ├── dist/               # Compiled output
│   │   ├── tests/              # Integration tests
│   │   └── package.json
│   │
│   ├── agentfn/               # AI function abstraction layer
│   ├── claudefn/              # Claude provider implementation
│   ├── geminifn/              # Gemini provider implementation
│   ├── kiminifn/              # Kimi provider implementation
│   ├── qwenfn/                # Qwen provider implementation
│   ├── acpfn/                 # Anthropic Claude Protocol
│   ├── codets/                # Code transformation utilities
│   ├── swebench/              # SWE-bench integration
│   └── tbench/                # Testing benchmark
│
├── examples/                   # Example projects
│   ├── stitch-to-flutter/       # Flutter app example
│   ├── flutter-app/
│   ├── fullstack-app/
│   ├── acp-demo/
│   └── ...
│
├── docs/                       # Documentation
│   ├── adr/                   # Architecture Decision Records
│   └── blog/
│
├── scripts/                    # Build/dev scripts
└── skills/                    # Converge skills (converge-control, converge-planning)
```

## Filesystem Storage Structure

When Converge runs in a project, it creates:

```
project/
├── .converge/
│   ├── project.yaml           # Project configuration (git-tracked)
│   ├── epics/
│   │   └── {epic-id}/
│   │       ├── epic.yaml      # Epic config (git-tracked)
│   │       ├── epic.status.yaml    # Runtime status (generated)
│   │       ├── epic.checkpoints/   # Checkpoint files
│   │       └── tasks/
│   │           └── {task-id}/
│   │               ├── task.yaml   # Task config (git-tracked)
│   │               └── task.status.yaml  # Runtime status
│   ├── journal/               # Execution logs
│   └── trends/               # Historical metrics
│
├── TASK.md                   # Task definitions (optional)
├── SKILL.md                  # Skill definitions (optional)
└── LEARN.md                  # Learning from failures (optional)
```

## Key File Patterns

### Project Config (`.converge/project.yaml`)
```yaml
id: my-project
goals:
  - id: goal-1
    description: Implement feature X
    satisfied: false
plugins:
  - name: my-plugin
ai:
  provider: claude
  model: claude-opus-4-7
```

### Epic Config (`.converge/epics/{id}/epic.yaml`)
```yaml
id: my-epic
title: My Epic
goals:
  - id: epic-goal-1
    description: Epic-level goal
tasks:
  - id: task-1
    type: implementation
    title: Task title
```

### Task Config (`.converge/epics/{id}/tasks/{id}/task.yaml`)
```yaml
id: my-task
title: My Task
type: implementation
inputs:
  - name: input1
    description: Input description
checks:
  - name: check-1
    command: grep -r "expected" src/
```

## Module Organization Pattern

Each module follows a consistent pattern:

```
module-name/
├── index.ts           # Public exports
├── types.ts           # Type definitions
├── module-name.ts     # Main implementation (or module-name-impl.ts)
├── helpers.ts         # Helper functions
├── utils.ts           # Utility functions
└── __tests__/         # Unit tests (co-located)
```

## Code Organization Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Immutable Context**: Context objects are read-only, created via factories
3. **Registry Pattern**: Functions registered centrally, looked up by type
4. **Hook System**: Extension via lifecycle hooks, not modification
5. **Filesystem-Native**: State stored in `.converge/` directory, git-friendly
