# WBS Script Guide

How to write `wbs.js` scripts that dynamically decompose complex problems into smaller tasks.

## When to Use WBS

WBS is for **gap-driven decomposition** — when a task is too coarse to execute directly, WBS decomposes it into finer-grained subtasks, each with its own inputs, outputs, and checks.

**Use WBS when:**
- A task contains N similar items that each need their own work (one per epic, one per entity, one per endpoint). The count isn't known until runtime.
- A task is too complex to execute atomically — it needs to be broken into steps where each step's output feeds the next.
- The decomposition requires reading data (JSON artifacts, code files) to decide what subtasks to spawn.

**Don't use WBS when:** The pipeline is fixed and known ahead of time (just hardcode tasks in the TASK.md tree), or there are fewer than 3 items.

## TASK.md Declaration

Declare a WBS script in the parent task's frontmatter:

```yaml
---
title: Decompose epics into tasks
wbs:
  type: nodejs
  path: ./wbs.js
blocking: true
---

Parent task body — describes what the WBS does at a high level.
```

### WBS types

| Type | Script | Use when |
|------|--------|----------|
| `nodejs` | Hand-written `wbs.js` | Task list is derivable from data files |
| `shell` | Shell script | Simple file-based spawning |
| `ai` | AI-generated script | Task list requires AI analysis to determine |

## The `ctx` API

Every WBS script exports an async `run(ctx)` function. The `ctx` object provides:

| Property | Type | Description |
|----------|------|-------------|
| `ctx.projectDir` | string | Absolute path to the project root |
| `ctx.vars` | object | Variables from TASK.md frontmatter `vars:` field |
| `ctx.spawn(shape)` | function | Create a child task (returns Promise) |
| `ctx.log` | object | Logger — `ctx.log.info(msg)`, `ctx.log.warn(msg)`, `ctx.log.error(msg)` |
| `ctx.spawnedTasks` | array | Read-only list of tasks spawned so far: `[{ id, writeToPath? }]` |
| `ctx.ai.ask(prompt)` | function | Ask AI a question — returns boolean or use `.asJson(schema)` for structured data |
| `ctx.plan.getPlanPath(relativePath)` | function | Resolve absolute path to a plan file from another task |
| `ctx.artifact` | object | Artifact store — `ctx.artifact.getPath(key)` resolves a file path by key |

### `ctx.ai.ask()`

Available in all WBS types. Two usage modes:

```javascript
// Boolean question (yes/no)
const ready = await ctx.ai.ask('Is the database schema complete?');

// Structured response with Zod schema
const analysis = await ctx.ai.ask('Analyze the API spec and list endpoint groups')
  .asJson(z.object({
    groups: z.array(z.object({
      name: z.string(),
      endpoints: z.array(z.string()),
    })),
  }));
```

Use `ctx.ai.ask()` when you need AI judgment to determine what subtasks to spawn (e.g., analyzing code complexity to decide decomposition strategy). Use `readFileSync` when the data is in a structured file (JSON, YAML).

### `ctx.plan.getPlanPath()`

Access plan artifacts from sibling or ancestor tasks:

```javascript
const planPath = ctx.plan.getPlanPath('../001-analyze/plan.md');
const plan = JSON.parse(readFileSync(planPath, 'utf-8'));
```

### `ctx.artifact`

Access named file artifacts shared across the project:

```javascript
const schemaPath = ctx.artifact.getPath('database-schema');
const schema = readFileSync(schemaPath, 'utf-8');
```

## `ctx.spawn()` Shape

The `spawn()` function accepts a `TaskMdShape` object. Only `id` is required — everything else is optional but strongly recommended.

### Required

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique task identifier (three-digit prefix + kebab-case) |

### Common fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Human-readable task title |
| `description` | string | One-line summary |
| `dependencies` | string[] | Task ids that must complete first |
| `inputs` | string[] | File paths this task reads |
| `outputs` | string[] | File paths this task produces |
| `checks` | CheckDef[] | Validation commands (id + cmd + description) |
| `body` | string | Markdown instructions for the AI executor |
| `skills` | string[] | Required converge skills |

### Advanced fields

| Field | Type | Description |
|-------|------|-------------|
| `agent` | string | Specific AI agent/model |
| `executor` | object | Custom executor (type: ai/script/function) |
| `wbs` | object | Nested WBS config (for recursive decomposition) |
| `plan` | object | Planning config |
| `tags` | string[] | Metadata tags |
| `materials` | string[] | Files to load as AI context |
| `vars` | object | Custom variables |
| `blocking` | boolean | Block all downstream tasks |
| `goalDefs` | GoalDef[] | Goal definitions produced on completion |
| `needs` | CheckDef[] | Precondition checks |
| `diagnosis-hints` | object[] | Hints for diagnosing failures |
| `correction-budget` | number | Max correction attempts |
| `auto-converge` | boolean/object | Auto-convergence policy |
| `context` | object[] | Context-building steps |
| `backlogs` | object[] | Backlog items to track |

## Pattern: Data-Driven Spawning

Read a JSON file, loop items, spawn one task per item.

This is the most common WBS pattern. The canonical example is `decompose-epics-wbs.js`:

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const name = ctx.vars?.name || 'default';
  const stateDir = `.converge/plan-state/${name}`;
  const outlinePath = join(ctx.projectDir, stateDir, 'outline.json');

  // Read data
  let outline;
  try {
    outline = JSON.parse(readFileSync(outlinePath, 'utf-8'));
  } catch (err) {
    throw new Error(`Cannot read outline: ${outlinePath} — ${err.message}`);
  }

  // Guard against empty data
  if (!outline.epics || outline.epics.length === 0) {
    throw new Error('Outline has no epics — nothing to decompose');
  }

  // Spawn one subtask per item
  let prevId = null;
  for (let i = 0; i < outline.epics.length; i++) {
    const epic = outline.epics[i];
    const padded = String(i + 1).padStart(3, '0');
    const taskId = `003-${padded}-${epic.id}`;
    const outputPath = `${stateDir}/epics/${epic.id}.json`;

    await ctx.spawn({
      id: taskId,
      title: `Decompose epic: ${epic.title}`,
      dependencies: prevId ? [prevId] : [],
      inputs: [
        `${stateDir}/outline.json`,
        `${stateDir}/requirements.json`,
        `${stateDir}/analysis.json`,
      ],
      outputs: [outputPath],
      skills: ['converge-planning'],
      needs: [
        {
          id: `${epic.id}-outline-ready`,
          cmd: `test -f ${stateDir}/outline.json`,
          description: `Outline must exist before decomposing ${epic.id}`,
        },
        {
          id: `${epic.id}-reqs-ready`,
          cmd: `test -f ${stateDir}/requirements.json`,
          description: `Requirements must exist before decomposing ${epic.id}`,
        },
      ],
      checks: [
        {
          id: `${epic.id}-exists`,
          cmd: `test -f ${outputPath}`,
          description: `${epic.id}.json created`,
        },
        {
          id: `${epic.id}-valid`,
          cmd: `node -e "const e=JSON.parse(require('fs').readFileSync('${outputPath}','utf-8'));if(!e.tasks||!e.tasks.length)throw 'no tasks'"`,
          description: `${epic.id} has tasks`,
        },
      ],
      body: `Decompose epic "${epic.title}" into 3-7 tasks.

Epic context:
- ID: ${epic.id}
- Description: ${epic.description}
- Complexity: ${epic.complexity || 'medium'}

Read requirements.json and analysis.json for full context.
For each task, specify id, title, outputs, checks, and body.`,
    });

    prevId = taskId;  // sequential execution
  }
}
```

### Key elements

- **Read data first** — parse the input JSON before spawning. The data tells you what to decompose.
- **Guard against empty** — throw if there's nothing to process. Zero items means upstream interpolation failed.
- **Padded IDs** — `String(i + 1).padStart(3, '0')` for consistent ordering
- **Sequential via prevId** — each task depends on the previous one (remove `prevId` for parallel execution when tasks don't share inputs)
- **Specific outputs** — exact file paths, not globs. Each output is a specific gap being closed.
- **`needs` for preconditions** — verify upstream artifacts exist before the task runs. Prevents wasted execution when dependencies are missing.
- **Layered checks** — file exists + valid JSON + semantic validation. Checks prove the gap is actually closed, not just that a file was written.
- **Inputs trace back** — every `inputs` entry must come from a prior task's `outputs`. This is the information contract that makes interpolation work.

## Pattern: Conditional Spawning

Check a condition, spawn only if needed, return early if nothing to do.

The canonical example is `deepen-tasks-wbs.js`:

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const name = ctx.vars?.name || 'default';
  const stateDir = `.converge/plan-state/${name}`;
  const planPath = join(ctx.projectDir, stateDir, 'plan.json');

  const plan = JSON.parse(readFileSync(planPath, 'utf-8'));
  const toDeepen = plan.needsDeepening || [];

  // Nothing to deepen — return immediately (zero subtasks)
  if (toDeepen.length === 0) return;

  let prevId = null;
  for (let i = 0; i < toDeepen.length; i++) {
    const item = toDeepen[i];
    const padded = String(i + 1).padStart(3, '0');
    const taskId = `003-d-${padded}-${item.epicId}-${item.taskId}`;
    const outputPath = `${stateDir}/deepened/${item.epicId}-${item.taskId}.json`;

    await ctx.spawn({
      id: taskId,
      title: `Sub-decompose: ${item.epicId}/${item.taskId}`,
      dependencies: prevId ? [prevId] : [],
      inputs: [`${stateDir}/plan.json`],
      outputs: [outputPath],
      checks: [
        { id: `deep-${padded}-exists`, cmd: `test -f ${outputPath}` },
        { id: `deep-${padded}-valid`, cmd: `node -e "JSON.parse(require('fs').readFileSync('${outputPath}','utf-8'))"` },
      ],
      body: `Sub-decompose task ${item.taskId} in epic ${item.epicId}.
Reason: ${item.reason}
Items: ${JSON.stringify(item.items || [])}`,
    });
    prevId = taskId;
  }
}
```

### Key elements

- **Early return** — `if (toDeepen.length === 0) return;` spawns zero tasks
- **Conditional logic** — only processes items that need it
- **Same spawn pattern** — once decided to spawn, follows the same structure as data-driven

## AI-Driven WBS (`type: ai`)

When the task list isn't known ahead of time and requires AI analysis.

### TASK.md declaration

```yaml
---
title: Decompose API layer
wbs:
  type: ai
  prompt: |
    Read src/api/spec.json which contains API endpoint definitions.
    Generate a wbs.js that spawns one subtask per endpoint group.
    Each subtask should implement handlers, validation, and tests.
  maxAttempts: 3
blocking: true
---

AI-driven WBS parent — AI generates a script that reads the API spec
and spawns per-endpoint-group subtasks.
```

### How it works

1. Converge reads the `prompt` field
2. AI generates a `wbs.js` script based on the prompt
3. Converge validates the generated script (syntax, spawn calls, checks)
4. Converge executes it through the normal nodejs WBS pipeline
5. If validation fails, retries up to `maxAttempts` times

### Using `ctx.ai.ask()`

Within an AI-generated WBS script, use `ctx.ai.ask()` to perform in-WBS analysis:

```javascript
export async function run(ctx) {
  // Ask AI to analyze the codebase and return structured data
  const analysis = await ctx.ai.ask(`
    Read src/api/routes/ and list all route files.
    Return a JSON array of objects with { file, endpoints, complexity }.
  `);

  const routes = JSON.parse(analysis);
  for (const route of routes) {
    await ctx.spawn({
      id: `001-${route.file.replace(/\.\w+$/, '')}`,
      title: `Implement ${route.file}`,
      outputs: [`src/api/routes/${route.file}`],
      checks: [{ id: `${route.file}-exists`, cmd: `test -f src/api/routes/${route.file}` }],
      body: `Implement endpoints: ${route.endpoints.join(', ')}`,
    });
  }
}
```

**When to use `ctx.ai.ask()` vs reading files directly:**
- Use `readFileSync` when the data is in a structured file (JSON, YAML)
- Use `ctx.ai.ask()` when you need to analyze unstructured content (source code, docs) or make judgment calls about complexity and decomposition strategy

## Rules

1. **Always `export async function run(ctx)`** — ESM format, not CommonJS
2. **Unique IDs with three-digit prefix** — `001-name`, `002-name`, etc.
3. **Every spawn must have `inputs`, `outputs`, `checks`, and (where applicable) `needs`** — the full information contract. `inputs` declare what knowledge the task consumes, `outputs` declare what it produces, `needs` verify preconditions before execution starts, `checks` prove the output is valid after execution.
4. **Set `outputs` to specific paths** — not globs, not directories (unless the output is a directory of files). Each output is a specific gap being closed.
5. **Dependencies encode information flow** — if task B reads a file that task A produces, B depends on A. Use `dependencies: [prevId]` for sequential, `dependencies: []` for parallel (only when tasks don't share inputs).
6. **Read before spawn** — always parse input data before the spawn loop. The data tells you what gaps exist and how many subtasks to create.
7. **Guard against zero items** — either `return` early or `throw` with a clear error
8. **WBS is recursive** — if a spawned subtask is still too coarse, give it its own `wbs` config to decompose further. Continue until every leaf task is executable.

## Error Handling

- **Missing inputs:** Throw immediately with a clear message. Don't spawn tasks that will fail.
- **Zero items:** Use `return` for conditional WBS (nothing to do is valid). Use `throw` for mandatory WBS (no items means something went wrong upstream).
- **Malformed data:** Wrap `JSON.parse()` in try/catch and throw with the file path in the error message.

### Execution flow

```
WBS script loaded
  |
  v
Read input data (throw on failure)
  |
  v
Validate data (throw on invalid/empty)
  |
  v
Loop items -> ctx.spawn() per item
  |
  v
Converge writes TASK.md files to disk
  |
  v
Converge executes each spawned task
```
