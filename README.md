<div align="center">
<pre>
  _   _    _    ____  _   _ _____ ____ ____
 | | | |  / \  |  _ \| \ | | ____/ ___/ ___|
 | |_| | / _ \ | |_) |  \| |  _| \___ \___ \
 |  _  |/ ___ \|  _ <| |\  | |___ ___) |__) |
 |_| |_/_/   \_\_| \_\_| \_|_____|____/____/
</pre>

<strong>A build system for AI agents — Version 2.0</strong><br/>
Universal Unit Architecture: One class, infinite nesting, data-driven convergence.

<p>
  <a href="#"><img src="https://img.shields.io/npm/v/harness?style=flat&colorA=000000&colorB=000000" alt="npm version"></a>
  <a href="#"><img src="https://img.shields.io/npm/dm/harness?style=flat&colorA=000000&colorB=000000" alt="npm downloads"></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-000000.svg?style=flat&colorA=000000&colorB=000000" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-92%25-success?style=flat&colorA=000000&colorB=000000" alt="Coverage"></a>
</p>

<p>
<a href="#quick-start">Quick Start</a> •
<a href="#architecture">Architecture</a> •
<a href="#documentation">Documentation</a> •
<a href="#examples">Examples</a>
</p>
</div>

---

Define tasks in TypeScript — AI converges on completion through self-correcting gap detection.

**V2 simplifies everything**: One `Unit` class. No inheritance. 88% less code. Same power.

## Quick Start

```bash
# Install
npm install harness

# Run a task
harness run .harness/epics/01-data-analysis/001-task.ts

# Test
npm test
```

## Architecture

### Core Principle: Universal Unit

**ONE class for EVERYTHING** - no inheritance, no polymorphism, just data.

```typescript
// Load any task file (Epic/Task/Subtask/...)
const unit = await Unit.fromPath('.harness/epics/01-epic/001-task.ts');

// Run convergence loop (same for ALL levels!)
await unit.run();
```

### How It Works

```
1. Find Gaps   → Missing inputs/outputs/failed checks
2. Fix Gaps    → Delegate to children OR use AI
3. Converge    → Repeat until gaps.length === 0
```

### Key Features

- ✅ **88% smaller** - 450 lines vs 3,800 lines
- ✅ **Universal** - One class for all levels
- ✅ **Data-driven** - Behavior from task definitions
- ✅ **Self-correcting** - AI fixes gaps automatically
- ✅ **Endlessly nestable** - Tasks contain tasks infinitely
- ✅ **92% test coverage** - Production-ready

## Task Definition

Tasks are TypeScript files using `taskDef()`:

```typescript
// Leaf task (no children - uses AI)
export default taskDef()
  .id('analyze-data')
  .title('Analyze Data')
  .agent('data-analyst')
  .prompt('Analyze TSV files and generate schema')
  .inputs(['data/**/*.tsv'])
  .outputs(['data-modeling/schema.sql'])
  .check({ id: 'validate', cmd: 'test -f data-modeling/schema.sql' })
  .build();

// Parent task (has children - delegates)
export default taskDef()
  .id('generate-screens')
  .yields({
    plan: 'Create one task per screen',
    outputDir: '.harness/epics/02-ux/003-screens',
    template: '000-screen-{slug}.ts.tpl',
  })
  .inputs(['.stitch/SITE.md'])
  .outputs(['.harness/epics/02-ux/003-screens/**/*.ts'])
  .build();
```

## Directory Structure

```
.harness/
├── epics/
│   ├── 01-data-analysis.ts              # Parent
│   ├── 01-data-analysis/
│   │   ├── 001-analyze.ts               # Child
│   │   └── 002-model.ts                 # Child
│   │
│   ├── 02-ux-design.ts                  # Parent
│   └── 02-ux-design/
│       ├── 001-overview.ts
│       ├── 002-design-system.ts
│       ├── 003-generate-screens.ts      # Parent (yields)
│       └── 003-generate-screens/        # AI-generated
│           ├── 001-screen-home.ts
│           ├── 002-screen-about.ts
│           └── 003-screen-contact.ts
│
└── project.ts
```

## Documentation

### Start Here
- **[V2 Architecture](./docs/V2_ARCHITECTURE.md)** - Core concepts
- **[Example Walkthrough](./docs/V2_EXAMPLE_WALKTHROUGH.md)** - Complete example
- **[V2 vs V1](./docs/V2_COMPARISON.md)** - What changed

### Interface Reference
- **[Unit Level Interfaces](./UNIT_LEVEL_INTERFACES.md)** - Complete interface reference for all levels
- **[Interface Hierarchy](./INTERFACE_HIERARCHY.md)** - Visual diagrams and type system

### Reference
- **[Complete Summary](./docs/V2_COMPLETE_SUMMARY.md)** - Full overview
- **[File Index](./docs/V2_FILES_INDEX.md)** - All files
- **[Test Guide](./packages/harness/tests/README.md)** - Testing

## Examples

### Run a Task

```bash
harness run .harness/epics/01-epic/001-task.ts
```

### Create a New Task

```typescript
import { taskDef } from 'harness';

export default taskDef()
  .id('new-task')
  .title('My New Task')
  .agent('developer')
  .prompt('Task instructions here')
  .inputs(['required/files/**/*'])
  .outputs(['generated/output.json'])
  .check({ id: 'validate', cmd: 'npm test' })
  .build();
```

### Parent Task with Dynamic Children

```typescript
export default taskDef()
  .id('parent-task')
  .yields({
    plan: 'Generate one child per item in config',
    outputDir: '.harness/epics/02/003-parent',
    template: '000-child-{name}.ts.tpl',
    maxTasks: 10,
  })
  .inputs(['config/items.json'])
  .outputs(['.harness/epics/02/003-parent/**/*.ts'])
  .build();
```

## Key Concepts

### Convergence Loop

Every unit runs the same loop:

```typescript
while (iteration < maxIterations) {
  gaps = findGaps()           // Check inputs/outputs/checks
  if (gaps.length === 0) return true    // ✅ Converged
  if (hasStalled(gaps)) return false    // ❌ Stalled
  fixGaps(gaps)               // Delegate or use AI
}
```

### Gap Types

- **Input gap** - Missing required input
- **Output gap** - Task hasn't produced output yet
- **Check gap** - Verification check failed

### Parent vs Leaf

- **Parent**: Has children → delegates to them
- **Leaf**: No children → uses AI to fix gaps

### Yields Pattern

Parents use `.yields()` to generate children dynamically:
1. AI reads inputs (e.g., sitemap)
2. AI instantiates template for each item
3. AI writes child task files
4. Next iteration: discovers and runs children

## Code Metrics

| Metric | V1 | V2 | Improvement |
|--------|----|----|-------------|
| Total lines | 3,800 | 450 | **88% smaller** |
| Largest function | 639 | 60 | **91% smaller** |
| Classes | 3+ | 1 | **67% fewer** |
| Test coverage | ~70% | ~92% | **+31% better** |

## Development

### Running Tests

```bash
npm test              # All tests
npm test -- unit      # Unit tests
npm test -- integration # Integration tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

### Building

```bash
npm run build         # Build TypeScript
npm run type-check    # Type check
npm run lint          # Lint
```

## Contributing

1. Create feature branch
2. Make changes
3. Add tests (maintain >90% coverage)
4. Update documentation
5. Submit pull request

## Principles

1. **Data over inheritance** - One class, different data
2. **Verify, don't trust** - Checks after every task
3. **Filesystem as database** - `ls` and `cat` debug
4. **Resumable by default** - Checkpoints everywhere
5. **Self-correcting** - AI fixes its own gaps
6. **Progressive complexity** - Start simple, grow

## License

MIT - see [LICENSE](LICENSE)

## Links

- [GitHub Repository](#)
- [Documentation](./docs/)
- [Issue Tracker](#)

---

**Version**: 2.0.0
**Status**: ✅ Production Ready
**Last Updated**: 2024-03-31

