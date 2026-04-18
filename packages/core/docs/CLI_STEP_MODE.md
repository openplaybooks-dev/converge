# CLI Step Mode (`--step` Flag)

## Overview

The `--step` flag enables **single-step execution mode** for debugging and controlled iteration through the autonomous Converge loop.

## Purpose

When developing or debugging converge workflows, you often want to:

- Execute one iteration at a time
- Inspect the state after each step
- Manually control progression through the loop
- Avoid long-running autonomous loops during development

The `--step` flag provides this capability.

## Usage

```bash
# Run one iteration only
converge run --step

# Run one iteration with verbose output
converge run --step --verbose

# Run one iteration without auto-fix (manual mode)
converge run --step --auto-fix=false
```

## Behavior

When `--step` is enabled:

### 1. Single Iteration

- `maxIterations` is automatically set to `1`
- The loop executes exactly one iteration and exits
- Overrides any `--max-iterations` setting

### 2. No Wait Time

- `checkInterval` is automatically set to `0`
- No sleep between iterations (since there's only one)
- Completes almost immediately

### 3. Debug Messages

- Shows "Running Single Step (Debug Mode)" instead of "Starting Autonomous Converge Loop"
- Shows "Single Step Complete" instead of "Autonomous Loop Complete"
- Displays tip: "Run 'converge run --step' again to execute the next iteration"

### 4. All Other Features Work Normally

- Gap detection runs normally
- Self-planning works if enabled
- Auto-fix works if enabled
- Re-evaluation runs normally
- Journal logging works normally

## Typical Workflow

### Development/Debugging

```bash
# Step 1: Run first iteration
converge run --step --verbose

# Step 2: Inspect state
cat .converge/journal/project/*.events.jsonl
cat .converge/journal/project/*.gaps.yml

# Step 3: Run next iteration
converge run --step --verbose

# Step 4: Repeat until satisfied
converge run --step
```

### Manual Control

```bash
# Run one step without auto-fix (inspect only)
converge run --step --auto-fix=false

# Manually fix issues
vim .converge/epics/my-epic/tasks/my-task.ts

# Run next step with auto-fix
converge run --step
```

## Implementation Details

### Files Modified

1. **`src/cli/autonomous-run.ts`**
   - Added `step?: boolean` to `AutonomousRunConfig`
   - Added step-specific logging messages
   - Skip sleep when `config.step === true`

2. **`src/cli/commands-run.ts`**
   - Added `step?: boolean` to `AutoRunOptions`
   - Override `maxIterations` to `1` when step is true
   - Override `checkInterval` to `0` when step is true

3. **`src/cli/main.ts`**
   - Added `--step` flag parsing
   - Updated help text with step examples
   - Pass `step` option to `runAutonomousCommand`

### Logic Flow

```typescript
// In commands-run.ts
export async function runAutonomousCommand(
  options: AutoRunOptions = {},
): Promise<void> {
  const config: AutonomousRunConfig = {
    projectDir: options.dir,
    maxIterations: options.step ? 1 : options.maxIterations, // Override to 1
    checkInterval: options.step ? 0 : options.checkInterval, // Override to 0
    step: options.step,
    // ... other options
  };

  await autonomousRun(config);
}

// In autonomous-run.ts
export async function autonomousRun(
  userConfig: AutonomousRunConfig = {},
): Promise<void> {
  // ...

  log(
    config,
    config.step
      ? "🚀 Running Single Step (Debug Mode)"
      : "🚀 Starting Autonomous Converge Loop",
  );

  // Main loop
  while (shouldContinue(state, config)) {
    state.iteration++;

    await runIteration(projectDir, state, config);

    // Skip sleep in step mode
    if (shouldContinue(state, config) && !config.step) {
      await sleep(config.checkInterval);
    }
  }

  log(
    config,
    config.step ? "✅ Single Step Complete" : "✅ Autonomous Loop Complete",
  );

  if (config.step) {
    log(
      config,
      `\n💡 Tip: Run 'converge run --step' again to execute the next iteration`,
    );
  }
}
```

## Benefits

### For Development

- Fast feedback loop
- Easy to debug issues
- Controlled execution
- Inspect state between steps

### For Testing

- Predictable behavior
- Single iteration per test
- No timeouts or race conditions
- Easier to mock/stub

### For Production Debugging

- Safe to run in production
- No risk of runaway loops
- Manual control over fixes
- Incremental problem solving

## Examples

### Example 1: Debug Gap Detection

```bash
# Run step to see what gaps are detected
converge run --step --verbose

# Output:
# 🚀 Running Single Step (Debug Mode)
#    Project: /path/to/project
#    Max Iterations: 1
#    Mode: Single-step debug
#
# 🔍 Step 1: Discovering gaps...
#    Found 3 total gaps:
#    - Project: 1
#    - Epics: 1 with gaps
#    - Tasks: 1 with gaps
#
# ✅ Single Step Complete
# 💡 Tip: Run 'converge run --step' again to execute the next iteration
```

### Example 2: Manual Fix Workflow

```bash
# Step 1: Detect gaps without fixing
converge run --step --auto-fix=false

# Step 2: Manually review gaps
cat .converge/journal/project/project.gaps.yml

# Step 3: Manually fix one gap
vim .converge/epics/my-epic/tasks/my-task.ts

# Step 4: Run step with auto-fix to verify
converge run --step

# Step 5: Repeat for next gap
converge run --step --auto-fix=false
```

### Example 3: Integration Testing

```typescript
// Test that runs exactly one iteration
it("should detect and fix gaps in one iteration", async () => {
  const config: AutonomousRunConfig = {
    projectDir: testDir,
    step: true,
    autoFix: true,
    verbose: false,
  };

  await autonomousRun(config);

  // Verify exactly one iteration ran
  const events = await readEvents(testDir);
  expect(events.filter((e) => e.type === "SESSION_START")).toHaveLength(1);
  expect(events.filter((e) => e.type === "SESSION_END")).toHaveLength(1);
});
```

## Comparison: Normal vs Step Mode

| Feature                  | Normal Mode                           | Step Mode (`--step`)               |
| ------------------------ | ------------------------------------- | ---------------------------------- |
| Iterations               | Up to `maxIterations` (default: 100)  | Exactly 1                          |
| Sleep between iterations | `checkInterval` (default: 5s)         | 0ms (no sleep)                     |
| Duration                 | Up to `maxDuration` (default: 1 hour) | <1 second                          |
| Use case                 | Production, autonomous operation      | Development, debugging             |
| Control                  | Fully autonomous                      | Manual control                     |
| Loop message             | "Starting Autonomous Converge Loop"   | "Running Single Step (Debug Mode)" |
| Completion message       | "Autonomous Loop Complete"            | "Single Step Complete"             |
| Tip message              | None                                  | "Run again for next iteration"     |

## See Also

- [CLI Reference](./CLI_REFERENCE.md)
- [Autonomous Run Architecture](./AUTONOMOUS_RUN.md)
- [Journal System](../src/journal/README.md)
- [Gap-Driven Framework](./GAP_DRIVEN_FRAMEWORK.md)
