# Debugging Guide

## Common Issues and Solutions

### Task Not Executing

**Symptoms**: Task is planned but never runs.

**Debugging Steps**:
1. Check task status: `.converge/epics/{id}/tasks/{id}/task.status.yaml`
2. Verify task type is registered: `listFunctions()`
3. Check if task has prerequisites that failed
4. Enable debug logging

```typescript
import { createLogger, LogLevel } from '@converge/core';

const log = createLogger({ level: LogLevel.DEBUG });
log.debug('Task execution', { taskId, type, status });
```

---

### Check Always Failing

**Symptoms**: Check passes locally but fails in Converge.

**Debugging Steps**:
1. Check working directory: Tasks run from project root, not task dir
2. Check environment variables: Are they populated correctly?
3. Check file paths: Use absolute paths or context helpers
4. Run check manually: Copy command from task.status.yaml

```bash
cd /path/to/project
# Run the check command manually
npx tsc --noEmit
echo "Exit code: $?"
```

---

### Gap Detection Missing Gaps

**Symptoms**: Known issue exists but no gap detected.

**Debugging Steps**:
1. Verify EvalFn is registered for the goal
2. Check goal ID matches between config and evaluation
3. Enable gap detection logging

```typescript
const gaps = await gapDetector.detectEpicGaps(epicId, { debug: true });
console.table(gaps);
```

---

### Convergence Not Progressing

**Symptoms**: Same gaps detected repeatedly, no forward progress.

**Debugging Steps**:
1. Check execution trace in `.converge/journal/`
2. Look for repeated task failures
3. Check if LEARN.md has stale data
4. Verify AI provider is responding correctly

```bash
# View recent journal events
ls -la .converge/journal/
cat .converge/journal/events.json | jq '. | last(10)'
```

---

### Context APIs Not Working

**Symptoms**: `context.shell.exec()` fails or returns wrong results.

**Debugging Steps**:
1. Check context is properly passed to function
2. Verify shell command syntax
3. Check if shell is available in the environment
4. Test with minimal shell call

```typescript
// Add diagnostic to your task function
console.log('Working dir:', process.cwd());
console.log('Shell available:', !!context.shell);
const result = await context.shell.exec('pwd');
console.log('pwd result:', result);
```

## Logging and Tracing

### Enable Debug Logging

```typescript
import { createLogger, LogLevel } from '@converge/core';

const logger = createLogger({
  level: LogLevel.DEBUG,
  format: 'pretty', // or 'json'
});

logger.debug('Detailed info', { data: object });
logger.info('Normal info');
logger.warn('Warning');
logger.error('Error', { error });
```

### Trace Execution

```typescript
import { createExecutionTrace } from '@converge/core';

const trace = createExecutionTrace({
  includeStackTraces: true,
  includeEnvironment: true,
});

await trace.runTask(taskConfig, async () => {
  // Your task code
});
```

### Journal Analysis

```bash
# View all events
cat .converge/journal/events.jsonl | jq '.'

# Filter by event type
cat .converge/journal/events.jsonl | jq -c 'select(.type == "TASK_FAILED")'

# Count events by type
cat .converge/journal/events.jsonl | jq -r '.type' | sort | uniq -c
```

## Checkpoint Debugging

### View Checkpoint State

```bash
# List checkpoints
ls -la .converge/epics/{epic-id}/epic.checkpoints/

# Read checkpoint
cat .converge/epics/{epic-id}/epic.checkpoints/{checkpoint-id}.json
```

### Force Resume from Checkpoint

```typescript
import { ResumabilityManager } from '@converge/core';

const manager = createResumabilityManager(config);
const resumePoint = await manager.getResumePoint(epicId);
console.log('Resume from:', resumePoint.cursor);
```

### Clear Checkpoints (Force Fresh Start)

```bash
rm -rf .converge/epics/{epic-id}/epic.checkpoints/
rm -f .converge/epics/{epic-id}/epic.status.yaml
```

**Warning**: This loses all progress for the epic.

## Performance Profiling

### Measure Task Execution Time

```typescript
import { performance } from 'perf_hooks';

const start = performance.timer();
await taskFn(context);
const duration = performance.timer() - start;
console.log(`Task took ${duration}ms`);
```

### Memory Profiling

```typescript
import { reportMemory } from '@converge/core';

setInterval(() => {
  const mem = reportMemory();
  console.log(`Heap: ${mem.heapUsed}/${mem.heapTotal}MB`);
}, 10000);
```

### AI Call Tracing

```typescript
import { AIContext } from '@converge/core';

const ai = createProjectAI(config);
const tracedAI = ai.withTracing((call) => {
  console.log('AI Call:', { prompt: call.prompt.substring(0, 100), cost: call.cost });
});
```

## Common Error Messages

| Error | Meaning | Solution |
|-------|--------|----------|
| `Task type 'x' not registered` | Task function not in registry | Register with `registerTask()` |
| `Check 'x' failed: exit code 1` | Verification command failed | Run command manually, fix underlying issue |
| `GapDetector: no eval for goal 'x'` | Goal has no EvalFn | Register eval or mark goal as manual |
| `Hook 'x' failed: ... isolating` | Hook error, subsequent hooks skipped | Check hook implementation, fix error |
| `Checkpoint write failed` | Cannot write to disk | Check permissions, disk space |
| `AI provider rate limited` | API rate limit hit | Wait, implement backoff, reduce calls |
| `Context already exists` | Duplicate context creation | Use existing context, don't create new |

## Debugging Tools

### CLI Commands

```bash
# View project status
pnpm converge status

# View epic progress
pnpm converge epic list

# View task details
pnpm converge task show <task-id>

# View gap summary
pnpm converge gaps

# View journal
pnpm converge journal

# Reset epic (dangerous)
pnpm converge reset --epic <epic-id>
```

### Environment Variables

```bash
# Enable debug mode
export CONVERGE_DEBUG=1

# Set log level
export CONVERGE_LOG_LEVEL=debug

# Disable AI calls (dry run)
export CONVERGE_DRY_RUN=1

# Specify config path
export CONVERGE_CONFIG=/path/to/config.yaml
```

## Testing Extensions

### Unit Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerTask, getTask } from '@converge/core';

describe('My Extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register task function', async () => {
    registerTask('my-test-task', async (context) => {
      return { success: true };
    });

    const fn = getTask('my-test-task');
    expect(fn).toBeDefined();

    const result = await fn(mockContext);
    expect(result.success).toBe(true);
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRuntime } from '@converge/core';
import { createTempProject } from './helpers';

describe('Integration', () => {
  let project: TempProject;
  let runtime: Runtime;

  beforeAll(async () => {
    project = await createTempProject({
      'project.yaml': `id: test-project`,
    });
    runtime = await createRuntime(project.root);
  });

  afterAll(async () => {
    await project.cleanup();
  });

  it('should run convergence', async () => {
    const result = await runtime.orchestrator.run();
    expect(result.converged).toBe(true);
  });
});
```
