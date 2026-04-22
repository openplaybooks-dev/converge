# Agent Manager

Internal process lifecycle management for Claude CLI agents spawned by the Converge framework.

## Overview

The Agent Manager is a framework-internal component that provides automatic tracking, monitoring, and cleanup of Claude CLI processes. It operates transparently in the background - no user interaction required.

## Features

### Dual-Index Tracking

- **PID-based access**: System-level operations (kill, liveness check)
- **SessionId-based access**: Logical operations (resume session, track retries)

### Process Lifecycle Management

- Automatic registration via `onProcessSpawned` hook
- Exit event tracking (exit code, signal)
- Graceful and forced cleanup (SIGTERM → SIGKILL)

### Health Monitoring

- Activity-based hang detection (5-minute idle threshold)
- Orphan detection (parent process died)
- Leak detection (accumulated stuck processes)
- Periodic health checks (30-second intervals)

### Converge Integration

- Track converge metadata: `taskId`, `epicId`, `phase`, `strategyType`
- Query processes by task/epic/phase
- Task/epic-aware cleanup
- Journal event logging

### Diagnostics

- Exit code decoding (including Windows STATUS codes)
- Process state classification (healthy, idle, hung, crashed, leaked)
- Diagnostic reports with recommendations
- Log file analysis

## Architecture

```
AgentManager (Singleton)
├── AgentMonitor (per-process activity tracking)
├── AgentDiagnostics (exit code decoding, classification)
└── AgentCleanup (graceful shutdown, orphan cleanup)
```

## Usage

### Automatic Registration (Framework-Internal)

Converge automatically registers processes via the `onProcessSpawned` hook:

```typescript
// In agent-runner.ts
import { AgentManager } from "../agent-manager/index.js";

const agentManager = AgentManager.getInstance();

const executor = agentfn({
  prompt,
  cwd: projectDir,
  logDir,
  onProcessSpawned: (proc, logPath) => {
    agentManager.register(proc, {
      sessionId: proc.pid.toString(),
      logPath,
      convergeMetadata: {
        projectDir,
        epicId: "epic-1",
        taskId: "task-1",
        phase: "execution",
        strategyType: "task-run",
      },
    });
  },
});
```

### Querying Processes

```typescript
const manager = AgentManager.getInstance();

// Get by PID
const process = manager.getProcess(12345);

// Get by sessionId
const process = manager.getProcessBySession("session-abc");

// Get all processes
const allProcesses = manager.getAllProcesses();

// Get hung processes
const hungProcesses = manager.getHungProcesses();

// Get leaked processes
const leakedProcesses = manager.getLeakedProcesses();

// Get by task
const taskProcesses = manager.getProcessesByTask("task-1");

// Get by epic
const epicProcesses = manager.getProcessesByEpic("epic-1");
```

### Cleanup Operations

```typescript
import { AgentCleanup } from "../agent-manager/index.js";

// Graceful shutdown (SIGTERM → wait → SIGKILL)
await AgentCleanup.shutdownAll();

// Clean up orphans
const orphanCount = await AgentCleanup.cleanupOrphans();

// Clean up hung processes
const hungCount = await AgentCleanup.cleanupHungProcesses();

// Clean up by task
await AgentCleanup.cleanupTask("task-1");

// Clean up by session
await AgentCleanup.cleanupSession("session-abc");

// Full cleanup (orphans + hung + dead)
const stats = await AgentCleanup.fullCleanup();
```

### Diagnostics

```typescript
import { AgentDiagnostics } from "../agent-manager/index.js";

// Generate diagnostic report for a process
const report = await AgentDiagnostics.generateReport(12345);

console.log(report.classification.type); // 'healthy' | 'idle' | 'hung' | 'crashed' | 'leaked'
console.log(report.classification.reason);
console.log(report.classification.recommendation);

// Decode exit code
const exitInfo = AgentDiagnostics.decodeExitCode(3221225794);
console.log(exitInfo.name); // 'STACK_BUFFER_OVERRUN'
console.log(exitInfo.description); // 'Stack buffer overrun'
console.log(exitInfo.isRetryable); // false
```

### Metrics

```typescript
const manager = AgentManager.getInstance();

// Get overall metrics
const metrics = manager.getMetrics();
console.log(metrics.totalSpawned);
console.log(metrics.currentlyRunning);
console.log(metrics.hung);
console.log(metrics.leaked);
console.log(metrics.byPhase);
console.log(metrics.byStrategy);
console.log(metrics.successRate);

// Get task-specific metrics
const taskMetrics = manager.getMetricsByTask("task-1");
```

## Cleanup Handlers

Cleanup handlers are automatically registered at Converge startup:

```typescript
// In cli/main.ts
import { registerCleanupHandlers } from "../agent-manager/index.js";

registerCleanupHandlers();
```

This registers handlers for:

- `SIGINT` (Ctrl+C): Graceful shutdown with 5-second timeout
- `SIGTERM`: Graceful shutdown with 5-second timeout
- `beforeExit`: Cleanup orphans before Node exits
- `uncaughtException`: Emergency shutdown with 2-second timeout
- `unhandledRejection`: Emergency shutdown with 2-second timeout

## State Persistence

Process state is persisted to `~/.converge/agent-registry.json`:

```json
{
  "version": 1,
  "timestamp": 1712345678901,
  "processes": [
    {
      "pid": 12345,
      "sessionId": "session-abc",
      "command": "claude",
      "args": [],
      "cwd": "/project",
      "startedAt": 1712345678000,
      "lastActivityAt": 1712345678500,
      "status": "running",
      "logPath": "/project/.converge/logs/claudefn/2026-04-02T12-00-00-000Z_abc.log",
      "parentPid": 54321,
      "convergeMetadata": {
        "projectDir": "/project",
        "epicId": "epic-1",
        "taskId": "task-1",
        "phase": "execution",
        "strategyType": "task-run"
      }
    }
  ]
}
```

## Health Monitoring

The health monitor runs every 30 seconds and:

1. Checks for hung processes (idle > 5 minutes)
2. Checks for dead processes (PID no longer exists)
3. Updates process status
4. Cleans up dead processes
5. Persists state to disk

## Exit Code Decoding

The Agent Manager decodes exit codes to provide actionable diagnostics:

### Standard Unix Exit Codes

- `0`: SUCCESS
- `1`: GENERAL_ERROR (retryable)
- `2`: MISUSE (not retryable)
- `126`: NOT_EXECUTABLE
- `127`: COMMAND_NOT_FOUND
- `130`: SIGINT (Ctrl+C)
- `137`: SIGKILL
- `143`: SIGTERM

### Windows STATUS Codes

- `0xC0000005`: ACCESS_VIOLATION (segfault)
- `0xC00000FD`: STACK_OVERFLOW
- `0xC0000374`: HEAP_CORRUPTION
- `0xC0000142`: DLL_INIT_FAILED
- `0xC0000409`: STACK_BUFFER_OVERRUN

## Testing

Run tests:

```bash
cd packages/core
pnpm test src/agent-manager
```

Unit tests cover:

- Process registration and tracking
- Dual-index lookups (PID and sessionId)
- Hang detection
- Leak detection
- Cleanup operations
- Exit code decoding
- Metrics calculation

## Integration with claudefn

The `onProcessSpawned` hook in claudefn enables seamless integration:

```typescript
// In packages/claudefn/src/types.ts
export interface ClaudeFnOptions<T = string> {
  // ...
  onProcessSpawned?: (proc: any, logPath: string) => void;
}

// In packages/claudefn/src/claudefn.ts
const proc = spawn("claude", args, { cwd, stdio, env });

// Call hook if provided
if (onProcessSpawned) {
  onProcessSpawned(proc, logPath);
}
```

This hook is called immediately after spawning, allowing Converge to register the process before it starts executing.

## Design Decisions

### Why Converge Package (Not claudefn)?

1. **Separation of concerns**: claudefn is a low-level spawn utility; Converge is the orchestration layer
2. **Metadata richness**: Converge has taskId, epicId, phase context that claudefn doesn't know about
3. **Journal integration**: Agent events should be logged to task journals, not claudefn logs
4. **Internal framework tool**: AgentManager is a framework-internal component, not a user-facing tool
5. **Cleanup scope**: Converge can kill all agents for a task/epic/session; claudefn has no concept of tasks

### Why Dual-Index Tracking?

- **PID**: System identifier, changes on every spawn, used for OS-level control
- **SessionId**: Logical identifier, persists across retries, used for user-facing operations

This enables both low-level process management (kill by PID) and high-level session management (resume by sessionId).

## Limitations

- **Local processes only**: Does not support distributed process management
- **No resource limits**: Does not enforce CPU/memory limits (use cgroups for that)
- **No historical metrics**: Focuses on current session only
- **Optional resource monitoring**: CPU/memory stats require optional `pidusage` dependency

## Future Enhancements

- [ ] Resource usage alerts (CPU > 90%, memory > 1GB)
- [ ] Early warning system (detect hangs before 5-minute timeout)
- [ ] Process genealogy tracking (parent-child relationships)
- [ ] Session resume support (restart from crash point)
- [ ] Web dashboard for process monitoring
