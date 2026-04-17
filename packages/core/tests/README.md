# V2 Test Suite

This directory contains tests for the **V2 Universal Unit Architecture**.

## Test Structure

```
tests/
├── unit/                           # Unit tests
│   ├── unit.test.ts               # V2 Universal Unit class
│   └── journal/                   # Journal system (shared with V1)
│       ├── journal-api.test.ts
│       └── journal-writer.test.ts
│
└── integration/                   # Integration tests
    └── v2-convergence.test.ts     # Full convergence loop tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- unit

# Run integration tests only
npm test -- integration

# Run specific test file
npm test -- unit.test.ts

# Watch mode
npm test -- --watch
```

## Test Coverage

### Unit Tests (`tests/unit/unit.test.ts`)

**What's tested:**
- ✅ Unit constructor with task definitions
- ✅ Parent-child relationships
- ✅ Getter properties (inputs, outputs, checks)
- ✅ Gap detection (missing inputs/outputs)
- ✅ Glob pattern support
- ✅ Stall detection
- ✅ Project root resolution
- ✅ Child discovery
- ✅ Task file loading

**Coverage:**
- `Unit` class: ~90%
- Gap detection: 100%
- Child discovery: 100%

### Integration Tests (`tests/integration/v2-convergence.test.ts`)

**What's tested:**
- ✅ Full convergence loop
- ✅ Gap fixing with AI
- ✅ Stall detection
- ✅ Max iterations limit
- ✅ Parent-child delegation
- ✅ Yields pattern for dynamic subtask generation

**Scenarios:**
1. **Happy path**: All inputs/outputs exist → immediate convergence
2. **Gap fixing**: Missing outputs → AI fixes → convergence
3. **Stall detection**: Unfixable gaps → stall detected
4. **Max iterations**: Endless loop → stops at limit
5. **Parent delegation**: Parent discovers children → delegates → converges
6. **Yields pattern**: Parent generates subtasks → children execute

### Journal Tests (`tests/unit/journal/`)

**What's tested:**
- ✅ Journal API (event logging, reading)
- ✅ Journal writer (gap snapshots, status updates)

**Note**: These tests are shared between V1 and V2 since the journal system is used by both.

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Unit } from '../../src/unit.ts';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    const taskDef = {
      id: 'test',
      inputs: [],
      outputs: [],
      vars: {},
    };

    const unit = new Unit({
      parent: null,
      path: '/test.ts',
      taskDef,
      config: { maxIterations: 100, taskDef, path: '/test.ts' },
    });

    // Act
    const result = await unit.run();

    // Assert
    expect(result).toBe(true);
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Unit } from '../../src/unit.ts';
import { existsSync } from 'node:fs';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

describe('Integration Scenario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complex scenario', async () => {
    // Mock filesystem state
    vi.mocked(existsSync).mockReturnValue(true);

    // Create units
    const unit = await Unit.fromPath('/path/to/task.ts');

    // Suppress console output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Run convergence
    const success = await unit.run();

    // Assertions
    expect(success).toBe(true);

    consoleSpy.mockRestore();
  });
});
```

## Mocking Guidelines

### Filesystem Mocks

```typescript
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
}));

// In test:
vi.mocked(existsSync).mockReturnValue(true);
vi.mocked(readdir).mockResolvedValue([...]);
```

### GapFixer Mock

```typescript
vi.mock('../../src/executor/gap-fixer.ts', () => ({
  GapFixer: vi.fn().mockImplementation(() => ({
    fixGap: vi.fn().mockResolvedValue(true),
  })),
}));
```

### Console Output Suppression

```typescript
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
// ... run test ...
consoleSpy.mockRestore();
```

## Test Data

### Minimal Task Definition

```typescript
const taskDef: TaskDefinition = {
  id: 'test-task',
  title: 'Test Task',
  inputs: ['data/input.json'],
  outputs: ['dist/output.json'],
  vars: {},
};
```

### Parent Task with Yields

```typescript
const parentTaskDef: TaskDefinition = {
  id: 'generate-screens',
  title: 'Generate All Screens',
  inputs: ['.stitch/SITE.md'],
  outputs: ['.converge/epics/02-ux/003-screens/**/*.ts'],
  vars: {
    yields: {
      plan: 'Create one screen task per page',
      outputDir: '.converge/epics/02-ux/003-screens',
      template: '000-screen-{slug}.ts.tpl',
      maxTasks: 20,
    },
  },
};
```

### Child Task

```typescript
const childTaskDef: TaskDefinition = {
  id: 'screen-home',
  title: 'Home Screen',
  inputs: ['.stitch/DESIGN.md'],
  outputs: ['src/pages/Home.tsx'],
  vars: {
    agent: 'ui-developer',
    prompt: 'Generate Home.tsx component',
  },
};
```

## CI/CD Integration

Tests run automatically on:
- ✅ Pre-commit (via git hooks)
- ✅ Pull requests (via GitHub Actions)
- ✅ Main branch commits

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

## Coverage Reports

Generate coverage reports:

```bash
npm test -- --coverage
```

**Coverage targets:**
- Unit tests: >90%
- Integration tests: >80%
- Overall: >85%

## Debugging Tests

### Run single test in watch mode

```bash
npm test -- unit.test.ts --watch
```

### Run tests with verbose output

```bash
npm test -- --verbose
```

### Debug in VSCode

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

## Legacy Tests (Removed)

The following V1 test directories have been removed:
- ❌ `tests/unit/context/` - V1 context hierarchy
- ❌ `tests/unit/subtasks/` - V1 subtask processing
- ❌ `tests/unit/gap/` - V1 gap detection
- ❌ `tests/unit/functions/` - V1 function registry
- ❌ `tests/unit/executor/` - V1 executor
- ❌ `tests/integration/journal/` - V1-specific journal tests
- ❌ `tests/integration/gap-driven/` - V1 gap-driven tests
- ❌ `tests/integration/goal-driven/` - V1 goal-driven tests
- ❌ `tests/integration/cli/` - V1 CLI tests
- ❌ `tests/integration/convergence/` - V1 convergence tests
- ❌ `tests/integration/subtasks/` - V1 subtask tests
- ❌ `tests/e2e/` - V1 end-to-end tests

All V1 functionality is now covered by the simpler V2 tests.

## Next Steps

1. **Add E2E tests**: Full workflow with real task files
2. **Add performance tests**: Measure convergence speed
3. **Add stress tests**: Large project with many nested units
4. **Add snapshot tests**: Verify console output format
5. **Add mutation tests**: Ensure test quality

## Questions?

See the main documentation:
- [V2 Architecture](../docs/V2_ARCHITECTURE.md)
- [V2 Comparison](../docs/V2_COMPARISON.md)
- [V2 Example Walkthrough](../docs/V2_EXAMPLE_WALKTHROUGH.md)
