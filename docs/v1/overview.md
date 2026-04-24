# Converge - Project Overview

## What is Converge?

Converge is a **build system for AI agents** — Plan. Execute. Verify. Fix. Ship. It is a monorepo containing a TypeScript/Node.js framework that enables AI agents to work autonomously on software engineering tasks using a gap-driven, self-correcting convergence model.

**Repository**: https://github.com/myanlabs/converge

## Core Purpose

Converge solves the problem of AI agent reliability in software engineering by:

1. **Detecting gaps** between current and desired state
2. **Planning tasks** to close those gaps
3. **Executing** with verification checks
4. **Self-correcting** when checks fail
5. **Checkpointing** progress for crash-safe resumability

## Technology Stack

- **Language**: TypeScript 5.x
- **Runtime**: Node.js >=20
- **Package Manager**: pnpm (monorepo with workspace)
- **Key Dependencies**: zod (validation), minimal runtime deps (7 total)
- **AI Providers**: Claude, Gemini, Kimi, Qwen (via pluggable agentfn abstraction)

## Key Features

### Gap-Driven Model
Gaps represent the delta between current and desired state. The system continuously detects gaps, generates work, verifies, and self-corrects until convergence.

### Wave-Based Convergence
RED (evaluate goals) → YELLOW (plan from goals) → GREEN (execute tasks) → score improvement check. Stops after 2 consecutive stalls.

### Filesystem-Native Storage
`.converge/` directory IS the plan. `ls` is dashboard, `git diff` shows changes. No opaque state stores.

### Multi-Provider AI
Claude, Gemini, Kimi, Qwen supported via `agentfn` abstraction. No vendor lock-in.

### Crash-Safe Checkpoints
V3 stores only cursor position + execution context. Tree traversal naturally resumes from cursor.

### Lifecycle Hooks
Priority-ordered hooks for task:start, epic:complete, gap:resolved, etc. with error isolation.

## Project Structure

```
converge/
├── packages/
│   ├── core/           # Main framework (30+ modules)
│   │   └── src/
│   │       ├── orchestrator/   # Convergence loop
│   │       ├── runtime/        # Manager interfaces
│   │       ├── converge/       # Converge runner (RED/YELLOW/GREEN)
│   │       ├── executor/       # Task execution
│   │       ├── planning/       # Task file scanner/generator
│   │       ├── gap/            # Gap detection
│   │       ├── goal/           # Goal hierarchy
│   │       ├── journal/        # Event logging
│   │       ├── checkpoint/     # Resumability
│   │       ├── functions/      # Registry (CheckFn, EvalFn, PlanFn, TaskFn)
│   │       ├── context/        # Immutable context hierarchy
│   │       ├── storage/        # Filesystem storage
│   │       └── hooks/          # Lifecycle hooks
│   ├── agentfn/        # AI function abstraction
│   ├── claudefn/       # Claude provider
│   ├── geminifn/       # Gemini provider
│   ├── kiminifn/       # Kimi provider
│   ├── qwenfn/         # Qwen provider
│   ├── acpfn/          # Anthropic Claude Protocol
│   ├── codets/         # Code transformation
│   ├── swebench/       # SWE-bench integration
│   └── tbench/         # Testing benchmark
├── examples/
│   ├── stitch-to-flutter/       # Flutter examples
│   ├── flutter-app/
│   ├── fullstack-app/
│   └── ...
└── docs/               # Architecture documentation
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run converge on a project
pnpm converge

# Run tests
pnpm test
```

## Architecture Summary

Converge uses a **convergence orchestrator** that runs in a loop:
1. **EVALUATE**: GapDetector detects gaps
2. **ANALYZE**: ConvergenceAnalyzer assesses state
3. **PLAN**: Generate tasks from gaps
4. **EXECUTE**: Run tasks with verification
5. **CHECKPOINT**: Save progress for resume

The system is designed for **autonomous operation** — once configured, it can run, self-correct, and converge without human intervention.
