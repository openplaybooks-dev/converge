---
title: "Dynamic work-breakdown"
description: "Tasks spawn child tasks at runtime based on project state. Scope emerges from the problem instead of being predeclared."
sidebar:
  order: 3
---
## The pre-declared-graph problem

LangGraph, n8n, Temporal, every workflow framework that's structured as nodes and edges — they all assume you know the shape of the work before you start. You wire up the DAG, and execution follows the wires.

That's fine when the problem has a fixed shape. It breaks when the shape depends on the project. Three patterns that don't fit:

- **One task per discovered unit.** "Document each CLI command." How many commands? Depends on what's in `packages/cli/src/main.ts` today.
- **One task per source.** "Cross-validate every doc page against its declared `sources:`." How many pages? Depends on what the doc playbook has produced.
- **One task per item in a queue.** "Process every PR opened in the last week." Unknown until you call the GitHub API.

Without a runtime escape hatch, you either over-engineer the graph (declare 50 placeholder tasks, hope you have enough) or fall back to imperative loops outside the framework (and lose the framework's checkpointing, retries, and observability).

## Seed in converge

A task in converge can declare a `seed:` script in its frontmatter. Seed — work-breakdown structure — is the runtime escape hatch: at the moment the task runs, the script reads project state and spawns one child task per discovered unit.

```yaml
# .converge/playbooks/docs/tasks/08-reference/TASK.md
---
id: 08-reference
title: Phase 08 — Reference pages, one per CLI command
seed:
  script: scripts/seed-cli-pages.mjs
---
```

The script returns a list of task shapes:

```javascript
// scripts/seed-cli-pages.mjs
import { readFile } from "node:fs/promises";

export default async function (ctx) {
  const cliCommands = JSON.parse(
    await readFile("docs/_cli-commands.json", "utf-8"),
  );
  return cliCommands.map((cmd) => ({
    id: `001-${cmd.name}`,
    template: "templates/cli-command",
    vars: { name: cmd.name, description: cmd.description },
  }));
}
```

Each shape becomes a real task on disk, materialized from a template. The parent task sits in the tree as a "Seed parent" — completed when all its children pass.

## What this lets you express

Anything of the form *one X per Y, where Y is unknown until you look*. The docs playbook in this repo uses Seed three times: one task per CLI command (Phase 08), one task per example (Phase 05), one task per troubleshooting symptom (Phase 07). All three would otherwise need 30+ hand-written task files that drift out of sync with the source they're documenting.

The Seed script can read anything to decide what to spawn — a file, a directory listing, an API call, the project's own config. The framework doesn't constrain *how* you discover units; it just gives you a structured place to spawn them once you have.

## `ctx.ai` — invoking AI inside the Seed itself

The previous example reads `docs/_cli-commands.json` — neat structured data, easy to map. Real projects often need the opposite: the source of truth is a markdown spec, a freeform README, a transcript, or a slide deck. You don't have a JSON list — you have prose and need to discover units inside it.

That's what `ctx.ai` is for. It's the AI surface available *inside* the Seed context, designed for **unstructured-in, structured-out** transforms during planning.

```javascript
// scripts/sections-from-spec.mjs
import { z } from "zod";

export default async function (ctx) {
  // Ask the AI to read the freeform spec and emit a typed list.
  const plan = await ctx.ai.askJson(
    "Read .content/landing-spec.md and list every section to build. " +
    "Return one entry per section with id (kebab-case), title, intent.",
    z.object({
      sections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        intent: z.string(),
      })),
    }),
  );

  // Spawn one child per discovered section — same shape as a static seed.
  for (const section of plan.sections) {
    await ctx.spawn({
      template: "templates/section",
      vars: section,
    });
  }
}
```

Two things to notice:

1. **The schema is the contract.** `askJson(prompt, schema)` validates the AI's response against your Zod schema. If the AI hallucinates a missing field or wrong shape, the call throws — caught by the framework's repair pipeline. You never spawn malformed children.
2. **The AI has read-only tools.** Inside `ctx.ai`, the agent can `Read` and `Glob` but can't write or execute. Seed is planning, not work — `ctx.ai` enforces that. Actual file production happens in the spawned children, where checks gate completion.

The two API shapes:

| Call | Returns | Use when |
|---|---|---|
| `await ctx.ai.ask("question?")` | `boolean` | yes/no gate — "is the spec marked ready?" |
| `await ctx.ai.askJson("question", schema)` | `T` | extract a typed list — "what sections exist?" |

Patterns this unlocks:

- **Spec → tasks.** Author a markdown design doc; let Seed read it and spawn one task per section/component/screen. The doc becomes the source of truth, the playbook becomes its compiled form.
- **Issue triage.** Read a GitHub issue body or transcript; spawn one task per actionable item. Humans write naturally, framework gets structured work.
- **Codebase walk.** Read a directory of legacy files; classify and spawn one task per migration unit. The classifier is itself the AI call — no regex spaghetti.
- **Recursive shaping.** A Seed script can use `ctx.ai` to *decide whether to break further down* — "given this spec, do we need sub-phases?" — and only spawn the structure that's actually warranted.

The pattern is consistent: **the Seed uses AI to turn intent into structure, then the framework runs the structure deterministically.** AI for planning; checks for verification; checkpoints for resumption. Each layer does what it's good at.

## Composition with checks

Each spawned child has its own checks (declared in its template). The parent's check is implicit and recursive: "every child passed." If any child fails, the parent fails — and the framework knows precisely which child by drilling into the tree.

This is convergence at two levels: each child converges its own outputs against its own checks, and the parent converges by waiting for all children to converge. You get a hierarchy of contracts, each verifiable in isolation.

## Trade-offs

- **Determinism matters for re-runs.** A Seed script that returns different results each run (because it pulls from a live API, or because file order varies) will spawn ghost children on the next run. Make scripts deterministic — sort outputs, snapshot dynamic inputs.
- **Seed scripts can fail.** A script that crashes leaves the parent in a "seeded" state with no children. The framework's repair pipeline includes a `SeedScriptRepairStrategy` for this case, but a misbehaving script can still block a phase. Keep scripts small and side-effect-free.
- **Debugging spawned children is one level deeper.** When a CLI-command page fails, you debug the child task. When the Seed itself is wrong (missed a command, generated a bad slug), you debug the script. Two different surfaces.
- **Templates and vars create a soft typing problem.** A template that expects `{name, description}` and a script that returns `{title, blurb}` won't error — the template will just have empty placeholders. Validate the contract between Seed and template by hand.

## Where this lives in the codebase

- `packages/core/src/executor/seed-executor.ts` — the Seed execution engine: loads the script, runs it with a `ctx` object, materializes spawned children from templates onto disk, registers them in the task tree.
- `packages/core/src/config/task-definition.ts` — the `WbsFn` type, the `SeedContext` interface (including `ctx.ai`, `ctx.spawn`, `ctx.artifact`), and the `seed:` field in the TASK.md schema. `AskResult.asJson(schema)` is defined here too — the entry point for unstructured-to-structured AI extraction inside Seed.
- `.converge/playbooks/docs/tasks/08-reference/seed/templates/cli-command/` — a real Seed template in this repo. One folder = one templated task per spawned child.
- `packages/core/src/navigator/repair/strategies/seed-script-repair.ts` and `seed-generator-repair.ts` — repair strategies that handle the most common Seed failure modes.

The Seed escape hatch is what lets converge handle problems whose scope is data-dependent. If your problem has a static shape, you don't need it. If it doesn't, you'd otherwise be writing the same shape-discovery logic over and over outside any framework.

For the engineering view of how Seed handles partial-spawn corruption — children are staged in memory and committed in a single batch after the Seed function returns successfully — see the Seed atomic-spawn section of [Advanced: runtime hygiene](../advanced/05-runtime-hygiene).
