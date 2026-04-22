# Navigator Package Design

## Overview

The `@converge/navigator` package is a domain-agnostic, AI-driven dynamic graph navigator extracted from the converge core. It implements a resumable, crash-safe state machine for autonomous systems.

## Architecture

### Core Components

1. **Graph** (`graph.ts`)
   - Manages nodes and edges
   - Tracks execution order via edges
   - Serializable for crash-safe checkpointing
   - Query methods: `getBufferedNodes()`, `getLastN()`, etc.

2. **Navigator** (`navigator.ts`)
   - Main convergence loop: one action per iteration
   - Priority-based action selection
   - Predicate-driven applicability filtering
   - Goal condition checking
   - Stall detection (3 consecutive failures or duplicate handler failures)
   - Lifecycle hooks: `onBeforeAction`, `onAfterAction`

3. **Predicates** (`predicates.ts`)
   - Named predicate registry
   - String-based references for JSON serializability
   - Evaluated against snapshots for conditional execution

4. **Types** (`types.ts`)
   - Generic, extensible type system
   - `BaseSnapshot` - extend with domain-specific fields
   - `ActionHandler` - pluggable action functions
   - `Graph` interface - contract for graph implementations

## Key Design Principles

### 1. Graph as Checkpoint
The graph is the single source of truth. All state lives in nodes and edges, not in memory.

### 2. One Action Per Iteration
Simplifies reasoning, enables fine-grained checkpointing, and makes the system crash-safe.

### 3. Predicates Over Conditionals
Declarative conditions instead of imperative control flow. Predicates are named and registered, making the graph JSON-serializable.

### 4. Priority-Based Selection
The system decides what to do next based on:
- Node priority (higher = earlier)
- Applicability predicates
- Current snapshot state

### 5. Domain Agnostic
The navigator knows nothing about gaps, units, tasks, or converge-specific concepts. It operates on generic snapshots and actions.

## Integration with Core

The core package extends the navigator with domain-specific logic:

1. **Snapshot Extension**
   ```typescript
   interface ConvergeSnapshot extends BaseSnapshot {
     unit: Unit;
     gaps: Gap[];
     stallCount: number;
     // ... converge-specific fields
   }
   ```

2. **Action Handlers**
   - `detect-gaps`, `resolve-plan`, `repair-loop`, etc.
   - Registered in `actions.ts`
   - Can read/write graph for dynamic dispatch

3. **Predicates**
   - `noGaps`, `hasPlan`, `hasBlocker`, etc.
   - Registered in `predicates.ts`
   - Evaluated against converge snapshots

4. **Node Builders**
   - `buildPreflightNodes()` - always seeded
   - `buildResponseNodes()` - JIT injection based on gaps
   - `buildPostActionNodes()` - added after response nodes

## Testing Strategy

Tests lock in behavior at three levels:

1. **Graph Tests** (`graph.test.ts`)
   - Node/edge operations
   - Serialization/deserialization
   - Query methods

2. **Predicate Tests** (`predicates.test.ts`)
   - Registration and evaluation
   - Unknown predicate handling

3. **Navigator Tests** (`navigator.test.ts`)
   - Action execution order
   - Priority-based selection
   - Predicate filtering
   - Goal condition checking
   - Stall detection
   - Max actions limit
   - Lifecycle hooks

## Usage Example

```typescript
import { NavigatorGraph, PredicateRegistry, converge } from '@converge/navigator';

// 1. Define snapshot type
interface MySnapshot extends BaseSnapshot {
  counter: number;
}

// 2. Create graph and add initial nodes
const graph = new NavigatorGraph();
graph.addNode({
  id: 'increment',
  handler: 'increment',
  status: 'buffered',
  origin: 'initial',
  data: { priority: 10 },
});

// 3. Register action handlers
const registry = new Map([
  ['increment', async (snap, g) => {
    return { action: 'continue', counter: snap.counter + 1 };
  }],
]);

// 4. Register predicates
const predicates = new PredicateRegistry();
predicates.register('counterReached', (snap) => snap.counter >= 10);

// 5. Run convergence loop
const result = await converge({
  graph,
  snapshot: { iteration: 1, counter: 0 },
  registry,
  predicates,
  goalConditions: [
    { name: 'done', check: (s) => s.counter >= 10 }
  ],
  maxActions: 100,
});
```

## Future Enhancements

1. **Parallel Execution**: Support for concurrent action execution
2. **Distributed Graph**: Multi-node graph execution
3. **Time Travel**: Replay graph execution from any point
4. **Visualization**: Graph visualization tools
5. **Metrics**: Built-in performance and execution metrics

## Migration Notes

When migrating from the old navigator in core:

1. Import from `@converge/navigator` instead of `./repair/navigator`
2. Extend `BaseSnapshot` with converge-specific fields
3. Use `.js` extensions in imports (ESM requirement)
4. Graph interface now includes `toJSON()` method
5. Persistence is now optional via `PersistenceAdapter` interface
