# Skill-Based Task Framework

## Overview

The skill-based task framework transforms Converge so that **every task can be a folder** containing skills, resources, and optional configuration. This enables:

- ✅ **Dead simple tasks**: Just create `SKILL.md` - no code required
- ✅ **Self-contained**: All task resources in one folder
- ✅ **Dynamic skill loading**: Skills load automatically when tasks run
- ✅ **Zero config defaults**: Auto-detect inputs/outputs from SKILL.md
- ✅ **Backward compatible**: Old flat `.ts` files still work

## Task Structures

### Option 1: SKILL.md Only (Zero Config)

The simplest form - just create a folder with `SKILL.md`:

```
.converge/epics/01-data-analysis/001-analyze-data/
└── SKILL.md
```

**SKILL.md:**
```markdown
---
name: analyze-data
description: Analyze data files and generate summary report
allowed-tools:
  - Read
  - Write
  - Bash
inputs:
  - data/input.csv
outputs:
  - data/analysis-report.md
---

# Data Analysis Agent

You are a senior data analyst.

## Instructions

1. Read the input CSV file
2. Analyze the data
3. Generate a report
```

**Auto-generated config:**
- `id`: `001-analyze-data` (from folder name)
- `title`: `Analyze data files and generate summary report` (from description)
- `inputs`: `['data/input.csv']` (from frontmatter)
- `outputs`: `['data/analysis-report.md']` (from frontmatter)
- `checks`: `['check-data/analysis-report.md']` (auto-generated from outputs)
- `type`: `'skill-task'`

### Option 2: SKILL.md + task.ts (Explicit Config)

For tasks needing explicit configuration:

```
.converge/epics/01-data-analysis/002-generate-report/
├── SKILL.md
└── task.ts
```

**task.ts:**
```typescript
import { taskDef } from '@converge/core';

export default taskDef()
  .id('002-generate-report')
  .title('Generate Final Report')
  .type('skill-task')
  .inputs(['data/analysis-report.md'])
  .outputs(['reports/final-report.md'])
  .checks(['check-reports/final-report.md'])
  .build();
```

### Option 3: Full Task Folder (With Resources)

Complete task with all resources:

```
.converge/epics/02-ui-design/001-design-screens/
├── task.ts
├── SKILL.md
├── examples/
│   └── sample-screen.html
├── resources/
│   ├── design-template.html
│   └── component-library.md
└── workflows/
    ├── text-to-design.md
    └── edit-design.md
```

## How It Works

### 1. Discovery

The scanner discovers tasks in three ways:

```typescript
// Flat tasks (existing)
.converge/epics/**/*.ts

// Nested tasks with task.ts
.converge/epics/**/*/task.ts

// Nested tasks with SKILL.md only
.converge/epics/**/*/SKILL.md
```

For SKILL.md-only tasks, the scanner:
1. Parses frontmatter for inputs, outputs, checks
2. Generates default TaskConfig
3. Sets `type: 'skill-task'` and `metadata.isSkillOnly: true`

### 2. Execution

When a skill task runs:

```typescript
// 1. Create symlink
~/.claude/skills/001-analyze-data → .converge/epics/.../001-analyze-data/

// 2. Execute with claudefn
// claudefn auto-discovers skills from ~/.claude/skills/
const result = await claudefn({
  prompt: buildTaskPrompt(config),
  cwd: projectDir,
});

// 3. Validate outputs
const validated = await validateOutputs(config.outputs);

// 4. Remove symlink
rm ~/.claude/skills/001-analyze-data
```

### 3. Skill Loading

The `FunctionExecutor` handles skill loading:

```typescript
async executeAsSkill(ctx, config, taskFolder, options) {
  const taskId = path.basename(taskFolder);

  try {
    // Load skill via symlink
    await loadSkillToClaudeSkills(taskId, taskFolder, ctx);

    // Build prompt
    const prompt = buildTaskPrompt(ctx, config);

    // Execute with claudefn (TODO: integrate actual claudefn)
    // For now, simulates execution

    // Validate outputs
    const validated = await validateOutputs(ctx, config);

    return {
      success: validated.passed,
      filesModified: validated.filesModified,
      ...
    };
  } finally {
    // Always cleanup
    await unloadSkillFromClaudeSkills(taskId, ctx);
  }
}
```

## Benefits

### 1. Simplicity

```
# Before: Need task.ts + separate skill
.converge/epics/01-epic/001-task.ts
.converge/skills/some-skill/SKILL.md

# After: Just one folder
.converge/epics/01-epic/001-task/
└── SKILL.md
```

### 2. Self-Contained

Everything in one place:
- Skill instructions
- Examples
- Templates
- Resources
- Workflows

### 3. Reusable

```typescript
// Reference task folder from other tasks
import analyzeDataSkill from '../001-analyze-data/task.ts';

taskDef()
  .skill('001-analyze-data') // Reference by folder name
  .build();
```

### 4. Discoverable

```bash
# List all skills (including task skills)
converge list skills

# Output:
# - analyze-data (from 001-analyze-data task)
# - generate-report (from 002-generate-report task)
# - design-screens (from 001-design-screens task)
```

## Migration Guide

### Phase 1: Backward Compatible (Current)

Both old and new structures work:

```
# Old (still works)
.converge/epics/01-epic/001-task.ts

# New (also works)
.converge/epics/01-epic/001-task/
└── SKILL.md
```

### Phase 2: Gradual Migration

Migrate tasks one at a time:

```bash
# 1. Create folder
mkdir .converge/epics/01-epic/001-task/

# 2. Move task.ts (optional)
mv .converge/epics/01-epic/001-task.ts .converge/epics/01-epic/001-task/task.ts

# 3. Create SKILL.md
cat > .converge/epics/01-epic/001-task/SKILL.md << 'EOF'
---
name: task-name
description: What this task does
inputs: [input files]
outputs: [output files]
---
# Task Instructions
...
EOF
```

### Phase 3: Add Resources

Enhance tasks over time:

```bash
# Add examples
mkdir .converge/epics/01-epic/001-task/examples/
cp example-output.md .converge/epics/01-epic/001-task/examples/

# Add resources
mkdir .converge/epics/01-epic/001-task/resources/
cp template.md .converge/epics/01-epic/001-task/resources/
```

## Examples

See the example tasks in:
- `.converge/epics/01-example/001-analyze-data/` - SKILL.md only
- `.converge/epics/01-example/002-generate-report/` - SKILL.md + task.ts

## Implementation Status

✅ **Complete:**
- Task scanner updated to discover SKILL.md-only tasks
- FunctionExecutor updated to execute skill tasks
- Skill loading/unloading via symlinks
- Output validation
- Types updated for skill task metadata

⚠️ **TODO:**
- Integrate actual `claudefn` execution (currently simulated)
- Add skill dependency resolution
- Add skill caching
- CLI commands for skill management

## API Reference

### SKILL.md Frontmatter

```yaml
name: skill-name           # Required: Skill identifier
description: What it does  # Required: Used as task title if no task.ts
allowed-tools:             # Optional: Tools skill can use
  - Read
  - Write
  - Bash
inputs:                    # Optional: Input files
  - path/to/input.md
outputs:                   # Optional: Output files
  - path/to/output.md
checks:                    # Optional: Custom checks
  - check-name
dependencies:              # Optional: Other skills needed
  - other-skill
```

### TaskDefBuilder (task.ts)

```typescript
taskDef()
  .id('task-id')                    // Required
  .title('Task Title')              // Required
  .description('What it does')      // Optional
  .type('skill-task')               // Mark as skill task
  .inputs(['input/file.md'])        // Optional
  .outputs(['output/file.md'])      // Optional
  .checks(['check-name'])           // Optional
  .build();
```

## Testing

```bash
# Run discovery scan
cd packages/core
npm run test:discovery

# Run executor tests
npm run test:executor

# Run full converge
cd ../../workspace
npm run converge -- run --epic 01-example
```

## Troubleshooting

### Task not discovered

Check:
1. Is SKILL.md in correct location? `.converge/epics/**/**/SKILL.md`
2. Does frontmatter parse correctly? (valid YAML)
3. Run with debug: `DEBUG=converge:* npm run converge -- run`

### Skill not loaded

Check:
1. Does `~/.claude/skills/` exist?
2. Are symlink permissions correct?
3. Check logs: `cat .converge/journal/events.jsonl | grep SKILL`

### Outputs not validated

Check:
1. Are output paths relative to project root?
2. Do output directories exist?
3. Check task logs: `.converge/journal/{epic}/{task}.log.md`
