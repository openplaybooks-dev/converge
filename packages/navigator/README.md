# @converge/navigator

**AI-Driven Dynamic Graph Navigator** — A resumable, crash-safe state machine for autonomous systems.

## Overview

The Navigator is a graph-based execution engine that drives convergence loops in autonomous systems. It implements a **one action per iteration** model where the graph itself serves as the checkpoint, enabling crash-safe resumability and dynamic behavior injection.

## Core Concepts

### 1. Graph as Checkpoint
- **Nodes** represent actions with lifecycle status (`buffered`, `executing`, `done`, `failed`)
- **Edges** record transitions between nodes with timestamps and iteration metadata
- The entire graph serializes to disk after each action for crash-safe recovery

### 2. Just-In-Time Node Injection
Nodes are added dynamically in phases:
- **Phase 1 (Preflight)**: Always seeded at start
- **Phase 2 (Response)**: Injected when conditions are detected
- **Phase 3 (Post-action)**: Added after response nodes complete

### 3. Predicate-Driven Execution
- Actions have **applicability predicates** that determine when they can run
- Predicates are evaluated against the current snapshot
- Enables conditional branching without hardcoded control flow

### 4. Priority-Based Selection
- Each buffered node has a priority value
- Navigator picks the highest priority applicable action
- Allows dynamic reordering based on system state

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Navigator Loop                          │
│  1. Read graph (what happened so far?)                      │
│  2. Pick ONE buffered + applicable action                   │
│  3. Execute it                                              │
│  4. Write result to graph                                   │
│  5. Persist graph to disk                                   │
│  6. Yield — loop back to step 1                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Graph (State Machine)                     │
│  • Nodes: buffered → executing → done/failed                │
│  • Edges: transition history with timestamps                │
│  • Serializable: crash-safe checkpoint                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Action Registry                            │
│  • Pluggable handlers: (Snapshot, Graph) → WalkResult       │
│  • Domain-specific logic injected via registry              │
│  • Handlers can read/write graph for dynamic dispatch       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Predicate Registry                          │
│  • Named predicates: string key → boolean function          │
│  • Evaluated against Snapshot for applicability             │
│  • Enables JSON-serializable condition references           │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### Resumability
After a crash, load the graph from disk and continue from the last completed node. No state is lost.

### Statelessness
The navigator loop is pure: same inputs → same outputs. All state lives in the graph.

### Dynamic Dispatch
Actions can inject new nodes into the graph during execution, enabling reactive behavior.

### Goal-Driven Convergence
Define goal conditions that are checked after each iteration. When all goals are satisfied, convergence is complete.

### Stall Detection
The navigator reads the graph history to detect repeated failures and bail out automatically.

## Usage Example

```typescript
import { NavigatorGraph, converge } from '@converge/navigator';

// 1. Define your snapshot type
interface MySnapshot {
  readonly data: any;
  readonly iteration: number;
  // ... your domain state
}

// 2. Create action handlers
const myActionHandler = async (snap: MySnapshot, graph: Graph) => {
  // Do work
  return { action: 'continue', data: newData };
};

// 3. Build action registry
const registry = new Map([
  ['my-action', myActionHandler],
]);

// 4. Run convergence loop
const result = await converge({
  graph: new NavigatorGraph(),
  snapshot: initialSnapshot,
  registry,
  maxActions: 100,
});
```

## Design Principles

1. **Graph is truth**: All execution state lives in the graph, not in memory
2. **One action per iteration**: Simplifies reasoning and enables fine-grained checkpointing
3. **Predicates over conditionals**: Declarative conditions instead of imperative control flow
4. **JIT injection**: Nodes added dynamically based on runtime conditions
5. **Priority-based selection**: System decides what to do next based on current state

## License

MIT
