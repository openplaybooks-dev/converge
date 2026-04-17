# Scenario: Screen Generation Pipeline

**Pattern:** WBS (Work Breakdown Structure) with parallel subtask execution

**Use case:** Generate multiple UI screens for a mobile app from a UX specification.

---

## Epic Structure

```
02-ux-ui-design-screen-generation/
├── 001-create-ux-overview/
│   └── TASK.md (skill: ux-design)
├── 002-generate-design-system/
│   └── TASK.md (skill: ui-design)
├── 003-generate-screen-prompts/  ← parent
│   ├── TASK.md
│   ├── 003-001-prompt-dashboard/
│   ├── 003-002-prompt-billing/
│   └── 003-003-prompt-profile/
└── 004-generate-screens/  ← parent
    ├── TASK.md
    ├── 004-001-generate-dashboard/
    ├── 004-002-generate-billing/
    └── 004-003-generate-profile/
```

---

## Execution Flow

### Iteration 1: Create UX Overview

```bash
harness run --step
# Executes: 001-create-ux-overview
# Invokes: /ux-design skill
# Creates: .stitch/UX.md, .stitch/screens-plan.json
# Status: ✅ Complete
```

### Iteration 2: Generate Design System

```bash
harness run --step
# Executes: 002-generate-design-system
# Inputs: .stitch/UX.md
# Creates: .stitch/DESIGN.md
# Status: ✅ Complete
```

### Iteration 3: Spawn Prompt Tasks

```bash
harness run --step
# Executes: 003-generate-screen-prompts (WBS)
# Reads: .stitch/screens-plan.json
# Spawns: 003-001, 003-002, 003-003
# Status: 🔄 Waiting for subtasks
```

### Iterations 4-6: Generate Prompts

```bash
# Iteration 4
harness run --step
# Executes: 003-001-prompt-dashboard
# Creates: .stitch/prompts/dashboard.md
# Status: ✅ Complete

# Iteration 5
harness run --step
# Executes: 003-002-prompt-billing
# Creates: .stitch/prompts/billing.md
# Status: ✅ Complete

# Iteration 6
harness run --step
# Executes: 003-003-prompt-profile
# Creates: .stitch/prompts/profile.md
# Status: ✅ Complete
```

### Iteration 7: Spawn Screen Tasks

```bash
harness run --step
# Executes: 004-generate-screens (WBS)
# Parent 003 now complete (all prompts done)
# Spawns: 004-001, 004-002, 004-003
# Status: 🔄 Waiting for subtasks
```

### Iterations 8-10: Generate Screens

```bash
# Iteration 8
harness run --step
# Executes: 004-001-generate-dashboard
# Invokes: /stitch-generate skill
# Creates: screens/dashboard.html
# Status: ✅ Complete

# ... and so on for 004-002 and 004-003
```

---

## Implementation

### Parent Task with WBS

```yaml
# .harness/epics/03-build-screens/TASK.md
---
title: Build Screens
dependencies:
  - 02-foundation.001-breakdown-ux-to-screens
  - 02-foundation.002-generate-design-system
inputs:
  - .stitch/screens.json
  - .stitch/DESIGN.md
  - .stitch/UX.md
wbs:
  type: nodejs
  path: ./wbs.js
---

Parent task — wbs.js spawns one child task per screen.
```

### WBS Script (wbs.js)

```js
// .harness/epics/03-build-screens/wbs.js
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const screensPath = join(ctx.projectDir, '.stitch/screens.json');

  if (!existsSync(screensPath)) {
    throw new Error('Missing .stitch/screens.json');
  }

  const raw = JSON.parse(readFileSync(screensPath, 'utf-8'));
  const screens = Array.isArray(raw) ? raw : raw.screens;

  let prevScreenId = null;

  for (let idx = 0; idx < screens.length; idx++) {
    const { id: screenId, title, route } = screens[idx];
    const prefix = String(idx + 1).padStart(3, '0');
    const taskId = `${prefix}-${screenId}`;
    const component = screenId.split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

    await ctx.spawn({
      id: taskId,
      title: `Screen: ${title}`,
      skills: ['stitch-generate'],
      dependencies: prevScreenId ? [prevScreenId] : [],
      tags: ['screen', `screen-${screenId}`],
      vars: { screenId, componentName: component, route },
      inputs: ['.stitch/DESIGN.md', '.stitch/UX.md'],
      outputs: [`src/pages/${component}.tsx`],
      checks: [
        { id: 'page-exists', cmd: `test -f src/pages/${component}.tsx` },
        { id: 'has-export', cmd: `grep -q "export default" src/pages/${component}.tsx` },
      ],
      body: `Generate the "${title}" screen (route: ${route}).

Read .stitch/DESIGN.md and .stitch/UX.md for design context.

Output: src/pages/${component}.tsx`,
    });

    prevScreenId = taskId;
  }
}
```

### What Happens

1. Harness reads the parent TASK.md, sees `wbs:` config
2. Runs `wbs.js` — script calls `ctx.spawn()` per screen
3. Harness writes child TASK.md files to disk:
   ```
   03-build-screens/
   ├── TASK.md              ← parent
   ├── wbs.js               ← script
   └── tasks/
       ├── 001-dashboard/TASK.md    ← spawned
       ├── 002-profile/TASK.md      ← spawned
       └── 003-settings/TASK.md     ← spawned
   ```
4. Next iteration picks up children and executes them

---

## Key Patterns

### 1. Sequential Prerequisites (001 → 002)

Tasks 001 and 002 run sequentially:
- 002 depends on 001 via `.deps(['001-create-ux-overview'])`
- 002 also needs inputs from 001 via `.inputs(['.stitch/UX.md'])`

### 2. WBS Expansion

The parent task's `wbs.js`:
- Reads data file (screens.json)
- Loops over screens
- Calls `ctx.spawn()` per screen
- Harness writes child TASK.md files to disk

### 3. Sequential Screens via Dependencies

Each screen depends on the previous one via `prevScreenId`:
- Screen 1 runs first (no deps)
- Screen 2 waits for screen 1
- Sequential order prevents resource contention

### 4. Dynamic Scaling

Add screens to `screens.json` → wbs.js spawns more tasks automatically. No manual TASK.md creation needed.

---

## Benefits of This Pattern

**Dynamic scaling:**
- Add more screens to screens.json → automatically more tasks created
- No manual task definition needed per screen

**Resumable:**
- If screen 2 fails, fix and retry just that task
- Completed screens stay done

**Resumable:**
- If 003-002 fails, others continue
- Fix and retry just that subtask
- No need to regenerate all prompts

---

## Common Issues

### WBS parent never completes

**Cause:** One or more subtasks failed or stuck

**Solution:**
```bash
# Check which subtasks completed
harness status

# Find failed subtasks
cat .harness/journal/.checkpoint.json | jq '.failedTasks'

# Fix failed subtask
harness reset 003-002
harness run --step 003-002
```

### Subtasks not discovered

**Cause:** WBS code has syntax error or didn't spawn

**Solution:**
```bash
# Check WBS parent logs
cat .harness/journal/epics/02-ux-ui-design/tasks/003-generate-screen-prompts/attempts/wip/log.log

# Look for spawn errors
grep -i "spawn" log.log

# Verify subtask files created
ls -la .harness/epics/02-ux-ui-design/003-generate-screen-prompts/
```

### Screens plan file missing

**Cause:** Upstream task 001 didn't create it

**Solution:**
```bash
# Verify upstream completed
harness status | grep 001-create-ux-overview

# Check if file exists
ls -la .stitch/screens-plan.json

# If missing, check upstream logs
cat .harness/journal/epics/02-ux-ui-design/tasks/001-create-ux-overview/attempts/wip/log.log
```

---

## Variation: 2-Level WBS (Pipeline Per Screen)

For complex screens, spawn a parent per screen with step children underneath:

```js
// wbs.js — 2-level hierarchy
export async function run(ctx) {
  const screens = JSON.parse(
    readFileSync(join(ctx.projectDir, '.stitch/screens.json'), 'utf-8')
  );

  for (let idx = 0; idx < screens.length; idx++) {
    const { id: screenId, title } = screens[idx];
    const prefix = String(idx + 1).padStart(3, '0');
    const screenTaskId = `${prefix}-${screenId}`;
    const basePath = `.harness/epics/03-build-screens/tasks/${screenTaskId}`;

    // Level 1: Screen parent
    await ctx.spawn({
      id: screenTaskId,
      title: `Screen: ${title}`,
      outputs: [`src/pages/${toPascalCase(screenId)}.tsx`],
      body: `Parent task for "${title}" screen pipeline.`,
    });

    // Level 2: Steps under the screen parent (use writeToPath)
    const stepPath = (id) => `${basePath}/tasks/${id}/TASK.md`;

    await ctx.spawn({
      id: `${prefix}-01-prompt`,
      title: `[${title}] Generate Prompt`,
      skills: ['stitch-prompt'],
      outputs: [`.stitch/prompts/${screenId}.md`],
      body: `Create prompt for "${title}" screen.`,
    }, { writeToPath: stepPath(`${prefix}-01-prompt`) });

    await ctx.spawn({
      id: `${prefix}-02-design`,
      title: `[${title}] Generate Design`,
      dependencies: [`${prefix}-01-prompt`],
      skills: ['stitch-generate'],
      outputs: [`.stitch/designs/${screenId}/design.html`],
      body: `Generate HTML design for "${title}".`,
    }, { writeToPath: stepPath(`${prefix}-02-design`) });
  }
}
```

**Result:**
```
03-build-screens/
├── TASK.md
├── wbs.js
└── tasks/
    ├── 001-dashboard/
    │   ├── TASK.md                       ← screen parent
    │   └── tasks/
    │       ├── 001-01-prompt/TASK.md     ← step 1
    │       └── 001-02-design/TASK.md     ← step 2
    └── 002-profile/
        ├── TASK.md
        └── tasks/
            ├── 002-01-prompt/TASK.md
            └── 002-02-design/TASK.md
```

---

## Summary

**When to use WBS:**
- Number of tasks determined at runtime (read from data file)
- Many similar tasks (screens, stores, endpoints)
- Need sequential or parallel pipelines per item

**Key steps:**
1. Upstream task generates data file (screens.json, data-models.md)
2. Parent TASK.md declares `wbs: { type: nodejs, path: ./wbs.js }`
3. wbs.js reads data, calls `ctx.spawn()` per item
4. Harness writes child TASK.md files and executes them

**Benefits:**
- Scales automatically with data
- Clear hierarchy on disk
- Resumable — fix one child without re-running others
