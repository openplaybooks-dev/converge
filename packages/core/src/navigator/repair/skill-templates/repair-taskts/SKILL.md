---
name: repair-taskts
description: Fix task.ts definition issues — WBS syntax, missing .build(), empty checks, import errors, TypeScript errors
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
tags:
  - repair
  - gap:output
  - gap:check-failed
  - gap:wbs
context:
  - type: gap
    fields: [gapKind, unitPath, taskTitle, taskId]
  - type: file
    path: "{unitPath}"
    label: taskts-source
  - type: cmd
    cmd: "npx tsc --noEmit {unitPath} 2>&1 | head -20"
    label: typescript-errors
  - type: ai
    prompt: >
      Read the task.ts file at `{unitPath}` and check for these issues:
      1. `.wbs({type: 'dynamic', items: [...]})` object syntax instead of `.wbs(async (ctx) => { ctx.spawn(...) })`
      2. Missing `.build()` call at the end of the taskDef chain
      3. Empty checks array `.checks([])`
      4. Missing `import { taskDef } from '@converge/core'`
      5. WBS function that never calls `ctx.spawn()`
      6. TypeScript compilation errors

      For each issue: state what's wrong, the line number, and the exact code fix.
    label: issue-analysis
    tools: [Read]
    timeoutMs: 30000
---

# Repair task.ts

Fix structural issues in a task.ts definition file.

## Step 1: Read Context

1. Read `repair-context/gap.md` — what gap triggered this
2. Read `repair-context/issue-analysis.md` — AI pre-analysis of issues
3. Read `repair-context/taskts-source.md` — the actual task.ts content
4. Read `repair-context/typescript-errors.txt` — tsc output
5. Read `repair-context/history.md` (if exists)

## Step 2: Fix Issues

Create a backup first:

```bash
cp "{unitPath}" "{unitPath}.backup"
```

Then apply fixes based on the analysis:

### WBS object → function

If the file has `.wbs({type: 'dynamic', items: [...]})`, convert to:

```typescript
.wbs(async (ctx) => {
  await ctx.spawn(taskDef().id('item-1').title('...').build());
  await ctx.spawn(taskDef().id('item-2').title('...').build());
})
```

### Missing .build()

Append `.build()` at the end of the taskDef chain.

### Empty checks

Replace `.checks([])` with at least one meaningful check.

### Missing import

Add `import { taskDef } from '@converge/core';` at the top.

### TypeScript errors

Read `repair-context/typescript-errors.txt` and fix each error.

## Step 3: Verify

```bash
npx tsc --noEmit "{unitPath}" 2>&1
```

Should produce no errors.
