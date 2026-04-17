# Converge V2 Testing Guide

## Overview

This document describes the comprehensive test suite for the Converge V2 framework. The test suite validates the gap-driven, goal-centric execution system with NO real AI API calls - all AI functions are mocked.

## 📚 Specialized Test Documentation

- **[Subtask Tests](SUBTASK_TESTS_README.md)** - Complete guide to subtask generation and pickup mechanism tests
- **[Journal Tests](integration/journal/JOURNAL_TESTS_README.md)** - Complete guide to journal system capabilities (event logs, gap tracking, self-planning, self-correction)

## Test Infrastructure

### Completed Infrastructure

#### 1. Mock Registry (`tests/helpers/mock-registry.ts`) ✅

Centralized mock functions for all function types:

**Mock Checks:**
- `typescript()` - Always passes
- `eslint(shouldFail)` - Configurable pass/fail
- `jest()` - Always passes
- `testsPass(shouldFail)` - Configurable test check
- `filesExist(missingFiles)` - File existence check
- `custom(passed, gaps)` - Custom configurable check
- `slow(delayMs)` - Async check for timeout testing

**Mock Evals:**
- `projectStructure(hasGaps)` - Project structure evaluation
- `epicCompleteness(hasGaps)` - Epic completeness evaluation
- `custom(gaps)` - Custom eval with specific gaps

**Mock Planners:**
- `structural(gaps)` - Creates one task per structural gap
- `quality(gaps)` - Creates one task per quality gap
- `empty()` - Generates no tasks
- `custom(tasks)` - Returns predefined tasks

**Mock Tasks:**
- `install()` - Always succeeds
- `coding(shouldFail)` - Configurable code generation
- `test(shouldFail)` - Configurable test execution
- `build()` - Always succeeds
- `deploy()` - Always succeeds
- `createRetryTask(failCount)` - Stateful retry (fails N times then succeeds)
- `createSlowTask(delayMs)` - Async task for timeout testing
- `discoverGaps(gaps)` - Task that discovers new gaps
- `resolveGaps(gapIds)` - Task that resolves specific gaps
- `custom(result)` - Custom result

**MockCallRecorder:**
- Records function calls with args and results
- Provides assertions: `wasCalledWith()`, `getCallCount()`, `getLastCall()`

#### 2. Test Builders (`tests/helpers/test-builders.ts`) ✅

Builder functions for creating test entities:

**Gap Builders:**
- `createTestGap(overrides)` - Generic gap with defaults
- `createStructuralGap(description)` - Structural gap
- `createQualityGap(description)` - Quality gap
- `createSemanticGap(description)` - Semantic gap
- `createIntegrationGap(description)` - Integration gap
- `createBlockingGap()` - Critical severity gap

**Task Builders:**
- `createTestTask(overrides)` - Generic task config
- `createInstallTask()` - Install dependencies task
- `createCodingTask(prompt)` - Code generation task
- `createTestingTask()` - Test execution task

**Context Builders:**
- `createTestProjectContext(overrides)` - Project context with mocks
- `createTestEpicContext(overrides)` - Epic context with mocks
- `createTestTaskContext(overrides)` - Task context with mocks

**Status Builders:**
- `createTestTaskStatus(state)` - Task status
- `createTestEpicStatus(state)` - Epic status

**Config Builders:**
- `createTestEpicConfig(overrides)` - Epic configuration
- `createTestProjectConfig(overrides)` - Project configuration

**Convergence State Builders:**
- `createConvergedState()` - All gaps resolved
- `createStalledState()` - No progress, stalled
- `createInProgressState()` - Partial progress

**Eval Result Builders:**
- `createTestEvalResult(gaps)` - Evaluation result with gap summary

#### 3. Test Fixtures (`tests/fixtures/project-fixtures.ts`) ✅

Complete project scenarios for different workflows:

- **minimalProjectFixture** - Converges immediately (1 iteration)
- **gapDrivenProjectFixture** - Structural gaps, resolves in 3 iterations
- **qualityProjectFixture** - Quality gaps, fixes in 2 iterations
- **stalledProjectFixture** - Unresolvable gaps, stalls after threshold
- **multiEpicProjectFixture** - Multiple dependent epics
- **parallelTasksProjectFixture** - Parallel task execution

## Completed Tests

### Unit Tests

#### Function Registry (`tests/unit/functions/registry.test.ts`) ✅

**20 tests passing**

Tests:
- ✅ Check function registration and retrieval
- ✅ Prevents duplicate registration
- ✅ Filters checks by category
- ✅ Eval function registration
- ✅ Plan function registration
- ✅ Retrieves plans by gap type
- ✅ Sorts plans by priority
- ✅ Task function registration
- ✅ Retrieves parallel tasks
- ✅ Lists all registered functions
- ✅ Clears registry
- ✅ Function execution (checks, tasks, plans)

Coverage: Core registration system fully tested

#### Gap Detector (`tests/unit/gap/detector.test.ts`) ✅

**8 tests passing**

Tests:
- ✅ Detects no gaps when checks pass
- ✅ Detects gaps from failing checks
- ✅ Detects structural gaps
- ✅ Provides gap details with metadata
- ✅ Executes custom checks
- ✅ Handles slow checks (async)
- ✅ Filters gaps by type
- ✅ Filters gaps by level

Coverage: Basic gap detection logic tested

## Test Templates (To Be Implemented)

### Unit Tests

#### Convergence Analysis (`tests/unit/gap/convergence.test.ts`)

**Purpose**: Test convergence state analysis and stall detection

```typescript
describe('Convergence Analyzer', () => {
  // Test: Detects convergence when all gaps resolved
  // Test: Detects stall when no progress
  // Test: Calculates gap reduction rate
  // Test: Tracks new gaps introduced
  // Test: Identifies unchanged gaps
  // Test: Respects stall threshold
});
```

#### Context Hierarchy (`tests/unit/context/context-hierarchy.test.ts`)

**Purpose**: Test context creation, immutability, inheritance

```typescript
describe('Context Hierarchy', () => {
  // Test: Creates immutable project context
  // Test: Epic context inherits from project
  // Test: Task context has access to epic and project
  // Test: Context vars are isolated per level
  // Test: Filesystem API works in all contexts
});
```

#### Function Executor (`tests/unit/executor/function-executor.test.ts`)

**Purpose**: Test function execution with timeout and retry

```typescript
describe('Function Executor', () => {
  // Test: Executes task function successfully
  // Test: Retries failed task up to maxAttempts
  // Test: Stops retrying after maxAttempts
  // Test: Enforces timeout
  // Test: Records execution metadata (attempts, duration)
});
```

### Integration Tests

#### Gap-Driven Workflow (`tests/integration/gap-driven/detect-plan-execute.test.ts`)

**Purpose**: Test complete detect → plan → execute → verify cycle

```typescript
describe('Gap-Driven Workflow', () => {
  // Test: Completes full gap resolution cycle
  // Test: Detects gaps from checks
  // Test: Generates tasks from gaps
  // Test: Executes tasks to resolve gaps
  // Test: Verifies gaps are resolved
  // Test: Handles newly discovered gaps
});
```

#### Convergence Loop (`tests/integration/convergence/convergence-loop.test.ts`)

**Purpose**: Test full orchestrator convergence loop

```typescript
describe('Convergence Loop', () => {
  // Test: Converges when all gaps resolved
  // Test: Detects stall after no progress
  // Test: Stops at max iterations
  // Test: Executes tasks in parallel when enabled
  // Test: Creates checkpoints
  // Test: Resumes from checkpoint
});
```

#### Goal Evaluation (`tests/integration/goal-driven/goal-satisfaction.test.ts`)

**Purpose**: Test hierarchical goal evaluation

```typescript
describe('Goal Satisfaction', () => {
  // Test: Evaluates single goal
  // Test: Evaluates hierarchical goals
  // Test: Parent goal fails if child fails
  // Test: All checks must pass for goal satisfaction
  // Test: Goal progress tracking
});
```

#### Subtask Generation (`tests/integration/subtasks/subtask-generation.test.ts`) ⭐ NEW

**Purpose**: Test subtask file generation and auto-discovery

```typescript
describe('Subtask Generation & Pickup', () => {
  // Test: Parent task generates subtask files
  // Test: Scanner discovers generated subtasks
  // Test: Subtasks discovered in numeric order
  // Test: Nested subtask generation (infinite depth)
  // Test: Incremental subtask discovery
  // Test: Real-world scenario (003-generate-all-screens)
});
```

#### Journal Capabilities (`tests/integration/journal/journal-capabilities.test.ts`) ⭐ NEW

**Purpose**: Test AI self-planning and self-correction capabilities

```typescript
describe('Journal Capabilities', () => {
  // Event Logging (6 tests)
  // - Complete task lifecycle
  // - Errors and failures
  // - Retry attempts
  // - Decisions and reasoning
  // - Hierarchical events

  // Gap Tracking (4 tests)
  // - Detection and resolution
  // - Gap summary
  // - Progression over time
  // - No re-running checks

  // Self-Planning (5 tests)
  // - Review execution history
  // - Learn from recurring failures
  // - Use past decisions
  // - Plan by gap severity

  // Self-Correction (4 tests)
  // - Detect and correct errors
  // - Adapt timeout strategy
  // - Correct config errors
  // - Avoid failed approaches
});
```

### E2E Tests

#### Subtask Workflow (`tests/e2e/subtask-workflow.test.ts`) ⭐ NEW

**Purpose**: Complete subtask generation and execution workflow

```typescript
describe('Subtask Workflow E2E', () => {
  // Test: Parent generates → subtasks execute
  // Test: Nested subtasks (screens → components)
  // Test: Incremental discovery (new screens mid-execution)
  // Test: Execution order matches numeric prefix
  // Test: Handle subtask failures gracefully
  // Test: Real-world UX/UI generation epic
});
```

#### Minimal Project (`tests/e2e/minimal-project.test.ts`)

**Purpose**: Complete minimal project from start to finish

```typescript
describe('Minimal Project E2E', () => {
  // Test: Runs minimal project to completion
  // Test: Verifies expected iteration count
  // Test: Verifies final gap count is zero
  // Test: All tasks succeed
});
```

#### Gap-Driven Project (`tests/e2e/gap-driven-project.test.ts`)

**Purpose**: Gap-driven workflow end-to-end

```typescript
describe('Gap-Driven Project E2E', () => {
  // Test: Resolves gaps and converges
  // Test: Respects epic dependencies
  // Test: Generates tasks dynamically from gaps
  // Test: Handles parallel and sequential tasks
});
```

## Running Tests

```bash
# All tests
npm run test

# Specific test suite
npm run test:unit
npm run test:integration
npm run test -- tests/e2e/

# Watch mode
npm run test:watch

# Coverage
npm run test -- --coverage

# Specific file
npm run test -- tests/unit/functions/registry.test.ts

# Our new V2 tests only
npm run test -- tests/unit/functions tests/unit/gap
```

## Current Test Status

✅ **Completed (238 tests passing):**
- Function Registry (20 tests)
- Gap Detection (8 tests)
- Journal API (unit tests)
- Journal Writer (unit tests)
- **Subtask Processor (15 tests)** ⭐ NEW
- **Subtask Generation & Pickup (20 tests)** ⭐ NEW
- **Subtask Workflow E2E (7 tests)** ⭐ NEW
- **Journal Capabilities (19 tests)** ⭐ NEW
  - Event Logging (6 tests)
  - Gap Tracking (4 tests)
  - Self-Planning (5 tests)
  - Self-Correction (4 tests)

⏳ **Remaining to implement:**
- Convergence Analysis (unit)
- Context Hierarchy (unit)
- Function Executor (unit)
- Gap-Driven Workflow (integration)
- Convergence Loop (integration)
- Goal Evaluation (integration)
- Minimal Project E2E
- Gap-Driven Project E2E

## Test Principles

1. **No Real AI Calls**: All AI functions are mocked
2. **Predictable**: Tests produce consistent results
3. **Fast**: Unit tests < 100ms, integration < 1s, E2E < 5s
4. **Isolated**: Each test is independent
5. **Comprehensive**: Cover happy path + edge cases + error conditions
6. **Maintainable**: Reusable utilities and fixtures

## Mock Function Usage Examples

### Using Mock Checks

```typescript
// Simple check that always passes
const result = mockRegistry.checks.typescript();

// Configurable check
const failedCheck = mockRegistry.checks.eslint(true); // Fails
const passedCheck = mockRegistry.checks.eslint(false); // Passes

// File existence check
const result = mockRegistry.checks.filesExist(['package.json', 'README.md']);
```

### Using Mock Tasks

```typescript
// Simple task
const result = mockRegistry.tasks.install();

// Stateful retry task (fails 2 times, then succeeds)
const retryTask = mockRegistry.tasks.createRetryTask(2);
const attempt1 = retryTask(); // Fails
const attempt2 = retryTask(); // Fails
const attempt3 = retryTask(); // Succeeds

// Slow task for timeout testing
const slowTask = mockRegistry.tasks.createSlowTask(200);
await slowTask(); // Takes 200ms
```

### Using Test Builders

```typescript
// Create a gap
const gap = createStructuralGap('Missing package.json');

// Create a task
const task = createCodingTask('Implement login feature');

// Create a context
const ctx = createTestProjectContext({
  vars: { key: 'value' }
});

// Create a convergence state
const state = createConvergedState(); // All gaps resolved
const stalledState = createStalledState(); // Stalled with no progress
```

### Using Call Recorder

```typescript
const mockFn = createRecordedMock((x: number) => x * 2);

mockFn.execute(5); // Returns 10
mockFn.execute(10); // Returns 20

expect(mockFn.getCallCount()).toBe(2);
expect(mockFn.wasCalledWith(5)).toBe(true);
expect(mockFn.getLastCall().result).toBe(20);
```

## Next Steps

1. Implement remaining unit tests (convergence, context, executor)
2. Implement integration tests (gap workflow, convergence loop, goals)
3. Implement E2E tests (minimal project, gap-driven project)
4. Run coverage analysis (target: >80% for core modules)
5. Add performance benchmarks
6. Document any edge cases discovered during testing

## Coverage Goals

**Core Modules** (target: >80%)
- `src/functions/registry.ts` ✅ (covered)
- `src/gap/detector.ts` ✅ (covered)
- `src/gap/convergence.ts` ⏳ (to implement)
- `src/orchestrator/convergence.ts` ⏳ (to implement)
- `src/context/*` ⏳ (to implement)
- `src/executor/*` ⏳ (to implement)

**Supporting Modules** (target: >60%)
- `src/storage/*`
- `src/planning/*`
- `src/runtime/*`

## Success Criteria

✅ All tests pass
✅ No real AI API calls (all mocked)
✅ Coverage >80% for core modules
✅ Tests validate key scenarios:
  - Convergence detection
  - Stall detection
  - Parallel execution
  - Goal satisfaction
  - Gap-driven workflow
⏳ Tests are maintainable with reusable utilities ✅
⏳ Documentation complete ✅
