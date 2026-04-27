---
title: "TASK.md"
description: "Complete schema reference for TASK.md frontmatter."
sidebar:
  order: 3
---

# TASK.md Frontmatter Reference

Complete reference for `TASK.md` frontmatter fields in converge V2.

## At-a-glance example

```yaml
---
id: 001-core-studio-api-export
title: Add @converge/core/studio-api re-export module
outputs:
  - packages/core/src/studio-api.ts
  - packages/core/package.json
checks:
  - id: studio-api-file-exists
    description: studio-api.ts module exists
    cmd: "test -f packages/core/src/studio-api.ts"
  - id: exports-entry
    description: package.json exports map has ./studio-api entry
    cmd: "node -e \"const e=require('./packages/core/package.json').exports;process.exit(e['./studio-api']?0:1)\""
---

Create a re-export module that surfaces every symbol the studio needs.
```

## Frontmatter fields

### Identity

- **`id`** (string, required) — unique identifier within the playbook. Used for dependency references and task ordering.
- **`title`** (string) — human-readable title for the task.
- **`description`** (string, optional) — short description of what the task does.

### Hierarchy / dependencies

- **`dependencies`** (string[], optional) — task IDs this task waits on before executing. Supports direct IDs and tag references (`tag:name`). Example: `["001-setup", "tag:design"]`
- **`blocking`** (boolean, default `true`) — if `true` and this task fails, tasks that depend on it are blocked.

### I/O contract

- **`inputs`** (string[], optional) — files/patterns this task reads. Globs supported. Missing inputs create gaps that block execution.
- **`outputs`** (string[], optional) — files/patterns this task produces. Globs supported. Missing outputs after execution cause the task to be marked incomplete (not blocked, but not marked done).
- **`tags`** (string[], optional) — arbitrary labels for filtering/organization. Example: `["milestone:html-design", "priority:high"]`
- **`goals`** (string[], optional) — project-level goals this task contributes to.

### Execution

- **`prompt`** (string or function, optional) — AI prompt for execution. Can be a static string or a callback receiving `TaskContext`.
- **`agent`** (string, optional) — AI agent name to use (e.g., `"developer"`, `"data-analyst"`).
- **`skill`** (string or string[], optional) — skill(s) to execute this task via. Can be a single skill name or array of names.
- **`vars`** (object, optional) — runtime variables passed to this task. Used by WBS templates and dynamic prompts.

### Validation

- **`checks`** (array or function, required for leaf tasks) — validation commands. Three forms:
  - Static array: `[{ id: "lint", cmd: "npm run lint" }]`
  - Mixed array with callbacks: `[{ id: "a" }, ctx => ({ id: "b", cmd: `test -f "${ctx.vars.file}"` })]`
  - Full callback: `ctx => [{ id: "check", cmd: "..." }]`
  Each check entry has:
  - `id` (string, required)
  - `description` (string, optional)
  - `cmd` (string, required) — shell command; exit 0 = pass
- **`backlogs`** (object, optional) — backlog scan definitions. Non-blocking checks that warn rather than fail. Defined in `packages/core/src/backlog/types.ts`.

### Dynamic children (WBS)

- **`wbs`** (object, optional) — Work Breakdown Structure configuration. When present, the converge calls a function once to spawn child tasks.

  In `task-definition.ts` this is `wbsFn` (the function itself), not a declarative object. The function signature is:
  ```ts
  wbsFn: (ctx: WbsContext) => Promise<void> | void
  ```

  The WBS function spawns children via `ctx.spawn()`, and the framework auto-writes them to a `tasks/` subdirectory under the parent task folder.

### Planning

- **`plan`** (boolean or object, optional) — enable plan mode. When present, converge generates `plan.md` in the task journal before execution, then injects it into the prompt.

  Forms:
  - `true` — use the task's `prompt` with a planning preamble
  - `string` — custom planning prompt
  - `object` — `{ prompt?, output?, outputPrompt? }` for full control

  In `task-definition.ts` this is `planConfig`.

### AI generation

- **`fromAI`** (object, optional) — AI-generated task body configuration. When present, converge invokes Claude to produce a `SKILL.md` or `task.ts`.

  Fields:
  - `prompt` (string, required) — natural language description
  - `output` (string, optional) — `'skill' | 'task' | 'auto'`
  - `complexity` (string, optional) — `'simple' | 'complex'`

  In `task-definition.ts` this is `fromAIConfig`.

### Loop execution

- **`loop`** (function, optional) — loop handler. The function is called once per iteration; return `ctx.loop.done()` to exit, or `ctx.loop.next()` to continue.

  - **`maxLoopIterations`** (number, default 20) — cap on loop iterations when using `loop`.

  In `task-definition.ts` these are `loopFn` and `maxLoopIterations`.

### Executor

- **`executor`** (function, optional) — programmatic executor function. Receives `ExecutorContext` and controls its own loop internally using `ctx.ai.fn()` and `ctx.spawn()`.

  In `task-definition.ts` this is `executorFn`.

### Converge wrapper

- **`converge`** (object or function, optional) — configure how the executor is wrapped.

  Forms:
  - No args — default mode: checks outputs + `.check()` validators
  - `fn` — custom `ConvergeFn` controls convergence
  - `{ mode?, fn?, maxIterations?, timeoutMs?, convergenceCriteria?, maxTaskDurationMs? }`

  In `task-definition.ts` this is `convergeConfig`.

### Execution modifiers

- **`async`** (boolean, optional) — mark task as async (non-blocking). Task starts immediately but doesn't block siblings.
- **`background`** (object, optional) — run as long-lived background process until epic ends. Config: `{ readyWhen?, healthCheck? }`
- **`schedule`** (string, optional) — re-run executor on a timer. Example: `'5s'`, `'1m'`. Options: `{ runImmediately?, skipIfBusy? }`
- **`sidecar`** (object, optional) — hook into other tasks' lifecycle events. Hooks: `'task:complete'`, `'task:failed'`, etc.

### Pre-flight

- **`needs`** (array, optional) — declare prerequisites (e.g., MCP servers) that must be available before the task runs.

  In `task-definition.ts` this is part of `vars.needs`.

### On-fail behavior

- **`onFail`** (object, optional) — configure sibling task reset on failure.
  - `reset` (string[], optional) — sibling task IDs to reset to pending when this task fails.

### Facts collection

- **`facts`** (function, optional) — collect project-level or task-specific facts before execution. Results stored in journal.

  Two forms:
  - Imperative: `async ctx => { await ctx.collect('id', 'cmd', 'description') }`
  - Declarative: `ctx => ({ 'screens-count': 'ls .stitch/prompts/*.md | wc -l' })`

  In `task-definition.ts` this is `factsApi`.

## Inheritance

Children inherit context from parent tasks and playbook-level configuration. Specifically:

- **Skills**: If a task has no `skill` but its parent does, the parent's skill is used. Skill resolution is controlled by `skillResolution` in vars (`"auto" | "manual" | "inherit"`).
- **Facts**: Project-level facts are collected once before any tasks run. Epic-level facts merge with project facts. Task-level facts merge with epic + project facts.
- **Variables**: The `vars` object is merged hierarchically — child tasks receive parent vars plus their own.

## Fields NOT in this reference

The task body may have listed fields from a previous V1 schema. Current source (`packages/core/src/config/task-definition.ts`) is authoritative. Any field not listed above is not in the current schema.

## See also

- [`packages/core/src/config/task-definition.ts`](file://packages/core/src/config/task-definition.ts) — `TaskDefinition` interface and builder API
- [`packages/core/src/storage/types.ts`](file://packages/core/src/storage/types.ts) — storage schemas including `TaskConfig`