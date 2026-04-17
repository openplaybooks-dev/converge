# WBS Script Reference

**Purpose:** How to write `wbs.js` scripts that spawn child tasks dynamically.

**When to use:** A task needs to generate N child tasks at runtime from data (screens, entities, endpoints, etc.).

---

## TASK.md Setup

Declare WBS in the parent task frontmatter:

```yaml
---
title: Build Screens
wbs:
  type: nodejs        # or 'shell'
  path: ./wbs.js      # relative to task directory
  args: [--verbose]   # optional CLI arguments
  env:                # optional environment variables
    MY_VAR: value
---
```

Place `wbs.js` next to the parent TASK.md:

```
.harness/epics/03-build-screens/
├── TASK.md       ← declares wbs: { path: ./wbs.js }
└── wbs.js        ← the script
```

---

## Script Contract

Export an async `run(ctx)` function. Call `ctx.spawn()` for each child task:

```js
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const data = JSON.parse(
    readFileSync(join(ctx.projectDir, 'data/items.json'), 'utf-8')
  );

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const prefix = String(i + 1).padStart(3, '0');

    await ctx.spawn({
      id: `${prefix}-process-${item.id}`,
      title: `Process ${item.name}`,
      skills: ['my-skill'],
      vars: { itemId: item.id },
      inputs: [`data/${item.id}.json`],
      outputs: [`output/${item.id}.txt`],
      checks: [
        { id: 'exists', cmd: `test -f output/${item.id}.txt` },
      ],
      body: `Process item "${item.name}".`,
    });
  }
}
```

---

## ctx API

| Property | Description |
|----------|-------------|
| `ctx.projectDir` | Absolute project root path |
| `ctx.vars` | Variables from parent task's `vars:` field |
| `ctx.spawn(shape, opts?)` | Write a child TASK.md to disk |
| `ctx.log.info(msg)` | Log info message |
| `ctx.log.warn(msg)` | Log warning |
| `ctx.log.error(msg)` | Log error |

---

## Spawn Shape

The object passed to `ctx.spawn()`:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique child task ID |
| `title` | ⬜ | Human-readable title |
| `body` | ⬜ | Markdown prompt (becomes TASK.md body) |
| `skills` | ⬜ | Skills to attach |
| `dependencies` | ⬜ | Task IDs this child depends on |
| `inputs` | ⬜ | Input files |
| `outputs` | ⬜ | Output files |
| `checks` | ⬜ | Validation checks (`{ id, cmd, description }`) |
| `tags` | ⬜ | Tags for filtering |
| `vars` | ⬜ | Task-scoped variables |
| `plan` | ⬜ | Planning phase config |

---

## Output

The harness writes child TASK.md files automatically — the script does NOT write files itself.

**Default path:**
```
parent-task-dir/tasks/{childId}/TASK.md
```

**Example:**
```
03-build-screens/
├── TASK.md
├── wbs.js
└── tasks/                          ← created by harness
    ├── 001-dashboard/TASK.md       ← from ctx.spawn({ id: '001-dashboard', ... })
    ├── 002-profile/TASK.md
    └── 003-settings/TASK.md
```

---

## 2-Level Hierarchy

For deeper nesting (parent → children → grandchildren), use the `writeToPath` option:

```js
export async function run(ctx) {
  const screens = loadScreens();

  for (const screen of screens) {
    const screenTaskId = `001-${screen.id}`;
    const basePath = `.harness/epics/03-build-screens/tasks/${screenTaskId}`;

    // Level 1: Screen parent
    await ctx.spawn({
      id: screenTaskId,
      title: `Screen: ${screen.title}`,
      outputs: [`src/pages/${screen.component}.tsx`],
      body: `Parent task for "${screen.title}" pipeline.`,
    });

    // Level 2: Step children (written under the screen parent)
    await ctx.spawn({
      id: `${screenTaskId}-01-prompt`,
      title: `[${screen.title}] Generate Prompt`,
      skills: ['stitch-prompt'],
      outputs: [`.stitch/prompts/${screen.id}.md`],
      body: `Create prompt for "${screen.title}".`,
    }, { writeToPath: `${basePath}/tasks/${screenTaskId}-01-prompt/TASK.md` });

    await ctx.spawn({
      id: `${screenTaskId}-02-design`,
      title: `[${screen.title}] Generate Design`,
      dependencies: [`${screenTaskId}-01-prompt`],
      skills: ['stitch-generate'],
      outputs: [`.stitch/designs/${screen.id}/design.html`],
      body: `Generate HTML design for "${screen.title}".`,
    }, { writeToPath: `${basePath}/tasks/${screenTaskId}-02-design/TASK.md` });
  }
}
```

**Result:**
```
03-build-screens/
├── TASK.md
├── wbs.js
└── tasks/
    └── 001-dashboard/
        ├── TASK.md                              ← screen parent
        └── tasks/
            ├── 001-dashboard-01-prompt/TASK.md   ← step 1
            └── 001-dashboard-02-design/TASK.md   ← step 2
```

---

## Spawn Options

Second argument to `ctx.spawn()`:

| Option | Description |
|--------|-------------|
| `writeToPath` | Override default path for child TASK.md |
| `label` | User-visible label in journal |
| `timeoutMs` | Timeout (default: 600000ms) |

---

## Error Handling

Throw errors with clear messages. The harness captures them and can attempt self-repair:

```js
if (!existsSync(dataPath)) {
  throw new Error(
    `Missing required file: ${dataPath}\n` +
    `This file should be generated by task '001-analyze-data' in epic 02.`
  );
}

if (items.length === 0) {
  throw new Error('No items found — expected data in items.json');
}
```

---

## Execution Flow

1. Harness reads parent TASK.md, sees `wbs:` config
2. Runs `wbs.js` — script calls `ctx.spawn()` per child
3. Harness writes child TASK.md files to disk
4. Harness records spawn results in `wbs.json` in the journal
5. Next iteration discovers children and executes them
6. Parent completes when all children complete

---

## See Also

- `examples/screen-generation.md` — Full WBS example with screens pipeline
- `preferences/task-api.md` — TASK.md frontmatter reference
