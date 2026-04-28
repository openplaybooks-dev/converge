---
title: Per-command UI views (fan-out)
wbs:
  type: nodejs
  path: ./wbs/index.js
---

# Per-command UI views (fan-out)

**Goal**: Implement one UI view per converge CLI command — form for args/options, invoke button, live output stream, result display.

## Scope

Each templated child receives one command spec from `cli-commands.json` (name, args, options, description, examples). It produces the view component, fills the route slot registered by `04-frontend-shell`, and calls the endpoint published by `03-backend`. Children inherit `cli-commands.json` plus the route and endpoint registries via vars/inputs.

## Fan-out

Driven by: one child per entry in `cli-commands.json` `.commands[]`; the script reads the manifest with `fs`/`ctx.read` and packs `{ commandName, args: JSON.stringify(args), options: JSON.stringify(options), description, examples: JSON.stringify(examples) }` into each spawned child's vars (id = commandName).

At runtime, `wbs/index.js` reads the driver, names children
deterministically, and calls `ctx.spawn(...)` per item. Each spawned
child gets its own TASK.md materialized into the journal.
