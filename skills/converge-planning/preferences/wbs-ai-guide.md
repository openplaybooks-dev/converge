# AI-Driven WBS Guide

**Purpose:** How to use `wbs: { type: ai }` to have AI generate and execute WBS scripts dynamically.

**When to use:** The task list isn't known ahead of time — AI must analyze data, code, or requirements to decide what subtasks to spawn.

---

## Overview

Standard WBS (`type: nodejs`) requires a hand-written `wbs.js`. AI-driven WBS (`type: ai`) tells the converge to:

1. Read the task's prompt and context (vars, inputs, project state)
2. Drive AI to generate a `wbs.js` script
3. Validate the generated script (syntax, spawn calls, checks)
4. Execute it through the normal nodejs WBS pipeline

```
TASK.md (type: ai, prompt)
    │
    ▼
  converge reads prompt + context
    │
    ▼
  AI generates wbs.js
    │
    ▼
  converge validates wbs.js (syntax, structure)
    │
    ▼
  converge executes wbs.js via nodejs WBS executor
    │
    ▼
  child TASK.md files written to disk
```

---

## TASK.md Declaration

```yaml
---
title: Decompose API endpoints
wbs:
  type: ai
  prompt: |
    Read the API spec at src/api/spec.json.
    Generate one subtask per endpoint.
    Each subtask should implement the handler, add validation, and write tests.
  model: default
  maxAttempts: 3
blocking: true
inputs:
  - src/api/spec.json
---

This task uses AI to generate the WBS script dynamically.
The AI will read the API spec and spawn one subtask per endpoint.
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `ai` |
| `prompt` | Yes | Instructions for the AI on what subtasks to generate |
| `model` | No | AI model to use (default: inherited) |
| `maxAttempts` | No | Max generation attempts before failing (default: 3) |

---

## How AI Generates WBS

The converge constructs a generation prompt from:

1. **The `prompt` field** — what the user wants decomposed
2. **Task context** — vars, inputs, outputs from the TASK.md
3. **Project context** — projectDir, tech stack info
4. **WBS API reference** — the ctx API and spawn shape (this document)
5. **Examples** — known-good WBS patterns

The AI generates a complete `wbs.js` file that:
- Exports `async function run(ctx) { ... }`
- Calls `ctx.spawn()` for each child task
- Uses `ctx.vars` and file reads for dynamic data
- Optionally uses `ctx.ai.ask()` for analysis during spawning

---

## Writing Good WBS Scripts (AI Reference)

### Minimal Template

```js
export async function run(ctx) {
  // 1. Read input data
  const data = JSON.parse(
    readFileSync(join(ctx.projectDir, 'path/to/input.json'), 'utf-8')
  );

  // 2. Iterate and spawn
  let prevId = null;
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const id = `${String(i + 1).padStart(3, '0')}-${slugify(item.name)}`;

    await ctx.spawn({
      id,
      title: `Process ${item.name}`,
      dependencies: prevId ? [prevId] : [],
      outputs: [`output/${item.id}.json`],
      checks: [
        { id: `${item.id}-exists`, cmd: `test -f output/${item.id}.json`, description: `Output for ${item.name} exists` },
      ],
      body: `Process "${item.name}".\n\nDetails: ${JSON.stringify(item)}`,
    });

    prevId = id; // sequential — remove for parallel
  }
}
```

### Rules for Good WBS Scripts

**Structure:**
- Always `export async function run(ctx)` — ESM, not CommonJS
- Use `import { readFileSync } from 'fs'` and `import { join } from 'path'` at top
- Never use `require()` — always ESM imports

**Spawning:**
- Every `ctx.spawn()` call must have a unique `id`
- IDs use three-digit prefix + kebab-case: `001-setup`, `002-build-api`
- Every spawn must have at least one `check` (file existence at minimum)
- Set `outputs` to specific file paths, not globs
- Write clear `body` instructions — this is what the AI executor reads

**Dependencies:**
- Use `dependencies: [prevId]` for sequential tasks
- Use `dependencies: []` for parallel tasks
- Cross-reference by exact task id string

**Error handling:**
- Throw with clear messages if input data is missing
- Check `data.length > 0` before iterating — zero spawns triggers repair

---

## Using ctx.ai.ask() Inside WBS

The generated WBS script can call `ctx.ai.ask()` to make AI-driven decisions during spawning. This enables a two-level AI flow:

```
Level 1: AI generates wbs.js (from TASK.md prompt)
Level 2: wbs.js calls ctx.ai.ask() during execution (for per-item analysis)
```

### ctx.ai.ask() API

**Boolean question:**
```js
const hasTests = await ctx.ai.ask('Does src/components/Button.tsx have unit tests?');
// hasTests === true or false
```

**Structured JSON response:**
```js
import { z } from 'zod';

const ComponentSchema = z.object({
  name: z.string(),
  props: z.array(z.string()),
  complexity: z.enum(['simple', 'medium', 'complex']),
});

const analysis = await ctx.ai.ask('Analyze src/components/Button.tsx')
  .asJson(ComponentSchema);
// analysis === { name: 'Button', props: ['onClick', 'label'], complexity: 'simple' }
```

### Example: AI-Analyzed WBS

```js
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const FileAnalysis = z.object({
  files: z.array(z.object({
    path: z.string(),
    description: z.string(),
    complexity: z.enum(['simple', 'medium', 'complex']),
    estimatedTasks: z.number(),
  })),
});

export async function run(ctx) {
  // Use AI to analyze the codebase and decide what to spawn
  const analysis = await ctx.ai.ask(
    `Scan src/api/ and list all route handler files. ` +
    `For each file, describe what it does and estimate complexity.`
  ).asJson(FileAnalysis);

  let prevId = null;
  for (let i = 0; i < analysis.files.length; i++) {
    const file = analysis.files[i];
    const padded = String(i + 1).padStart(3, '0');
    const slug = file.path.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const id = `${padded}-${slug}`;

    await ctx.spawn({
      id,
      title: `Refactor: ${file.description}`,
      dependencies: prevId ? [prevId] : [],
      inputs: [file.path],
      outputs: [file.path],
      checks: [
        { id: `${padded}-compiles`, cmd: 'npx tsc --noEmit', description: 'TypeScript compiles' },
      ],
      body: `Refactor ${file.path}.\n\nComplexity: ${file.complexity}\nDescription: ${file.description}`,
    });

    prevId = id;
  }
}
```

### When to Use ctx.ai.ask()

| Scenario | Use ctx.ai.ask()? | Why |
|----------|-------------------|-----|
| Items in a JSON file | No | Read the file directly |
| Items from directory listing | No | Use `readdirSync` |
| Items need code analysis | Yes | AI reads and understands code |
| Per-item complexity estimate | Yes | AI judges complexity |
| Conditional task generation | Yes | AI decides if task is needed |
| Fixed pipeline (investigate → fix → verify) | No | Hardcode the pipeline |

**Rule of thumb:** Use `ctx.ai.ask()` when the WBS needs to *understand* code, not just *list* files.

---

## Generation → Validation → Execution Flow

When `type: ai` is used, the converge:

### Step 1: Generate

Constructs a prompt:
```
You are generating a WBS script for the converge task system.

TASK: {task.title}
PROMPT: {wbs.prompt}
VARS: {JSON.stringify(task.vars)}
INPUTS: {task.inputs}
PROJECT DIR: {projectDir}

Generate a complete wbs.js file that:
1. Exports `async function run(ctx)`
2. Calls ctx.spawn() for each child task
3. Each spawn has: id, title, outputs, checks, body
4. Uses ESM imports (not require)

{WBS_API_REFERENCE}
{EXAMPLES}
```

### Step 2: Validate

Before execution, the converge checks:
- File parses without syntax errors
- Exports a `run` function
- Uses ESM syntax (no `require`, no `module.exports`)
- No dangerous operations (no `process.exit`, no `rm -rf`)

If validation fails, the converge retries generation (up to `maxAttempts`).

### Step 3: Execute

The validated `wbs.js` is executed through the standard nodejs WBS executor:
- `ctx.spawn()` writes child TASK.md files to disk
- Journal records the spawn event
- Autonomous run picks up children on next iteration

### Step 4: Write to Disk

The generated `wbs.js` is saved alongside the TASK.md for inspection:
```
task-dir/
├── TASK.md           ← declares wbs: { type: ai, prompt: ... }
└── wbs.generated.js  ← AI-generated script (saved for debugging)
```

---

## Patterns

### Pattern 1: Data-Driven Decomposition

AI reads a data file and spawns one task per item.

```yaml
wbs:
  type: ai
  prompt: |
    Read .converge/plan-state/outline.json.
    For each epic in the epics array, spawn a subtask that
    detail-decomposes the epic into individual tasks.
```

### Pattern 2: Code-Analyzed Decomposition

AI analyzes source code to decide what subtasks to create.

```yaml
wbs:
  type: ai
  prompt: |
    Scan src/components/ for all React components.
    For each component that lacks unit tests, spawn a
    subtask to write tests for it.
    Use ctx.ai.ask() to check each component for test coverage.
```

### Pattern 3: Conditional Pipeline

AI generates different pipelines based on project state.

```yaml
wbs:
  type: ai
  prompt: |
    Analyze the project to determine what setup is needed.
    If no package.json exists, spawn a setup task.
    If package.json exists but no tests, spawn a test-setup task.
    If tests exist but are failing, spawn a fix-tests task.
    Always spawn a verify task at the end.
```

### Pattern 4: Recursive Decomposition

AI decomposes and flags items that need further decomposition.

```yaml
wbs:
  type: ai
  prompt: |
    Read .converge/plan-state/plan.json.
    For each task flagged in needsDeepening, spawn a subtask
    that breaks it into smaller pieces.
    If you determine a sub-item is still too complex, flag it
    in the subtask's output for another round of deepening.
```

---

## Comparison

| | `type: nodejs` | `type: ai` |
|---|---|---|
| Script | Hand-written | AI-generated |
| Data source | File reads, hardcoded lists | AI analysis + file reads |
| When to use | Known structure, fixed patterns | Unknown structure, needs analysis |
| Speed | Fast (no AI call) | Slower (AI generation + optional AI analysis) |
| Debuggability | Source is in repo | Generated script saved as `wbs.generated.js` |
| ctx.ai.ask() | Available but rarely used | Common — two-level AI flow |

---

## See Also

- `preferences/wbs-reference.md` — Complete ctx API and spawn shape reference
- `playbooks/architect.md` — When to use WBS vs flat tasks
- `examples/screen-generation.md` — Data-driven WBS example
