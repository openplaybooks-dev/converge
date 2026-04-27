---
id: 005-core-api
title: Write docs/reference/core-api.md (@converge/core public API)
inputs:
  - packages/core/src/index.ts
  - packages/core/package.json
outputs:
  - docs/reference/core-api.md
checks:
  - id: page-exists
    cmd: "test -f docs/reference/core-api.md"
    description: page exists
  - id: lists-exports
    cmd: "test $(grep -cE '^###\\s+|`[A-Z][a-zA-Z]+`' docs/reference/core-api.md) -ge 8"
    description: lists at least 8 exported symbols
  - id: covers-exports-map
    cmd: "grep -qE '@converge/core|exports' docs/reference/core-api.md"
    description: covers the package exports map (subpaths)
---

# Write `docs/reference/core-api.md`

Reference for `@converge/core` — what users programmatically import.

Most users won't read this; they interact with the framework via CLI.
But framework integrators (the studio, custom dashboards, third-party
tooling) need this page.

## Required frontmatter

```yaml
---
title: "@converge/core"
description: "Public API surface of @converge/core for programmatic use."
sources:
  - packages/core/src/index.ts
  - packages/core/package.json
sidebar:
  order: 5
---
```

## Required structure

1. **Who this is for.** One paragraph: framework integrators, tooling
   authors, extension developers. CLI users don't need this page.

2. **Package exports map.** From `packages/core/package.json#exports`:
   - `@converge/core` — primary entry
   - `@converge/core/planner` — planner-only
   - `@converge/core/client` — client-only
   - `@converge/core/studio-api` — studio-facing surface
   Note which subpaths are stable vs subject to change.

3. **Top-level exports.** Read `packages/core/src/index.ts` and group the
   exports semantically:

   **Definition builders** — `taskDef()`, `defineProject()`, `loadPlaybook()`
   **Runtime** — `createRuntime()`, `Runtime`, `TaskManager`, `ProjectManager`
   **Convergence** — `ConvergenceConfig`, `ConvergenceOrchestrator`,
   `Gap`, `GapDetector`, `Goal`, `GoalHierarchy`
   **Hooks & registries** — `HookRegistry`, `CheckFn`, `EvalFn`, `PlanFn`,
   `TaskFn`
   **Discovery** — `DiscoveryScanner`

   For each, one line: what it does, when you'd use it.

4. **Tiny code example.** A 10-line sketch using one or two of the
   builders to show the shape: `import { defineProject, taskDef } from
   '@converge/core'; ...`. Make it work, not just compile.

5. **Stability note.** This API is pre-1.0 — minor breaking changes
   between minor versions. Pin exact versions for production use.

## Read first

- `packages/core/src/index.ts` — the canonical export list.
- `packages/core/package.json` for the `exports` map subpaths.
- Headlines / type definitions of the major exports — pull descriptions
  from in-source docstrings if present.

## Banned

- Documenting internal exports (anything not in `index.ts`). They're not
  public API.
- Promising stability you can't deliver. State the pre-1.0 reality.
- A full type signature dump. Link to the source if a reader needs the
  exhaustive type — this page is the orientation, not the reference.
