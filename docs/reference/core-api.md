---
title: "@openplaybooks/converge-core"
description: "Current programmatic API surface of @openplaybooks/converge-core."
sidebar:
  order: 5
---

This page documents the public programmatic surface that is exercised by the repo's smoke tests. For CLI usage, use the [`converge` command reference](./cli/index.md).

## Current entry points

The tested, current high-level API is:

- `definePlaybook(...)`
- `taskDef()`
- `run(playbook, opts)`
- `plan(opts)`
- `loadPlaybookFromFolder(dir)`
- `writePlaybookToFolder(playbook, dir)`
- `captureReporter()`

These are the main APIs to reach for when you want to build, load, execute, or serialize playbooks in code.

## Mental model

Converge uses one in-memory playbook shape regardless of how it was authored:

- **Code-defined playbooks** come from `definePlaybook(...)` plus `taskDef()`.
- **Folder-defined playbooks** come from `loadPlaybookFromFolder(...)` reading `playbook.yml` and `TASK.md` files.

Both produce the same `Playbook` object shape, and `run(...)` accepts either.

## Example

```ts
import {
  captureReporter,
  definePlaybook,
  run,
  taskDef,
} from "@openplaybooks/converge-core";

const playbook = definePlaybook({
  name: "in-code-smoke",
  description: "Three tasks in a linear chain.",
  run: { maxTaskAttempts: 1 },
  tasks: [
    taskDef()
      .id("a")
      .title("Write A")
      .executor(async ({ fs }) => {
        await fs.writeFile("out/a.txt", "from a");
      })
      .build(),
    taskDef()
      .id("b")
      .title("Write B")
      .depends_on(["a"])
      .executor(async ({ fs }) => {
        const a = await fs.readFile("out/a.txt", "utf8");
        await fs.writeFile("out/b.txt", `${a} -> b`);
      })
      .build(),
  ],
});

const reporter = captureReporter();
const result = await run(playbook, {
  projectDir: process.cwd(),
  reporter,
});

console.log(result.completed, result.failed);
```

For a full working example, see [tests/test-programmatic-api/run.mjs](/Users/minh/Documents/converge/tests/test-programmatic-api/run.mjs).

## Folder APIs

### `loadPlaybookFromFolder(dir)`

Parses a folder layout like:

```text
.converge/playbooks/default/
├── playbook.yml
└── tasks/
    ├── a/TASK.md
    └── b/TASK.md
```

Returns a `Playbook` with:

- `def`: the parsed `playbook.yml`
- `tasks`: an empty map for folder-backed playbooks
- `dir`: the source directory the runtime should read `TASK.md` files from

### `writePlaybookToFolder(playbook, dir)`

Serializes an in-memory playbook to `playbook.yml` plus `tasks/<id>/TASK.md`.

Important limitation:

- JS executor functions are in-memory only. The serializer writes frontmatter/body for agent-authored tasks, but it cannot round-trip arbitrary executor code from memory back into markdown.

## Execution APIs

### `run(playbook, opts)`

Runs a playbook and returns a structured run result. Current behavior, as exercised by tests:

- compiles the playbook to a DAG
- emits reporter events such as `run-start`, `compile-complete`, `task-complete`, `run-complete`
- writes runtime artifacts into `.converge/journal/<playbook>/`
- supports selection, defer/state, resume, and dry-run options

See the current event contract in [tests/test-programmatic-api/run.mjs](/Users/minh/Documents/converge/tests/test-programmatic-api/run.mjs).

### `captureReporter()`

Buffers emitted run events so tests or embedding code can assert on execution behavior without scraping stdout.

### `plan(opts)`

Planner entry point. It is part of the public API and callable from `@openplaybooks/converge-core`.

## What this page intentionally does not document

Older docs referenced runtime classes such as `Runtime`, `createRuntime`, `ProjectManager`, or `ConvergenceOrchestrator`. Those are not the current high-level public contract and should not be treated as the entry points for new integrations.

Converge is pre-1.0, so low-level exports still move. If you are integrating programmatically, prefer the entry points documented on this page over deep internal imports.
