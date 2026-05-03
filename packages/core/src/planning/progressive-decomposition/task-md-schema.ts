/**
 * Single source of truth for the TASK.md shape phase-2 implementers
 * emit. Phase 1 (analyze.ts) instructs the planner to populate the
 * matching fields in PLAN.md so phase 2 can copy them across without
 * silent drift.
 *
 * Conservative field set (validated against curated examples in
 * `examples/cinematic-video-production/`): every field below either
 * (a) appears in every curated TASK.md, or (b) is a kind-specific
 * pointer the runtime requires (`outputs`/`checks`, `driver:`).
 *
 * Source of truth for valid frontmatter keys:
 * `packages/core/src/config/task-md-definition.ts` (TaskMdDef).
 */

import type { ChildKind } from "./types.ts";

/** Frontmatter keys an eval script can grep for to verify quality. */
export function requiredFrontmatterKeys(kind: ChildKind): string[] {
  switch (kind) {
    case "executable":
      return ["id", "title", "description", "outputs", "checks", "tags"];
    case "container":
      return ["id", "title", "description", "tags"];
    case "seed":
      return ["id", "title", "description", "driver", "tags"];
  }
}

/**
 * The YAML+markdown template the phase-2 implementer is told to emit.
 * Returned as a single string ready to splice into the prompt.
 */
export function taskMdSchemaBlock(kind: ChildKind): string {
  switch (kind) {
    case "executable":
      return EXECUTABLE_BLOCK;
    case "container":
      return CONTAINER_BLOCK;
    case "seed":
      return SEED_BLOCK;
  }
}

const EXECUTABLE_BLOCK = `\
\`\`\`yaml
---
id: <child-id from PLAN.md, e.g. 00-scaffold>
title: <human title from PLAN.md>
description: <one paragraph from PLAN.md \`description\` — elaborates the objective>
dependencies:                    # omit if none
  - <sibling-id this child waits on>
inputs:                          # omit if none
  - <file path the child reads>
outputs:
  - <file path the child produces>
checks:
  - id: <id>
    cmd: <deterministic shell command, exit 0 = pass>
    description: <optional>
tags:                            # omit if none
  - <short kebab tag>
---

# <Title>

**Goal**: <one sentence from PLAN.md>

## Scope

<everything the child needs, packed by the parent — copy from PLAN.md>

## Instructions

<numbered, step-by-step body. Name the tools, the input files, and the
 output files. Concrete commands beat prose. Copy from PLAN.md \`body\`
 verbatim — do not paraphrase down.>

## Output schema           # ONLY when outputs contains a .json manifest

<JSON shape, copied verbatim from PLAN.md body if present.
 Reference: examples/cinematic-video-production/.../02-cast/001-extract/TASK.md>

## Example                 # ONLY when outputs contains a .json manifest

<one filled-in record, copied verbatim from PLAN.md body if present>
\`\`\`
`;

const CONTAINER_BLOCK = `\
\`\`\`yaml
---
id: <child-id from PLAN.md>
title: <human title from PLAN.md>
description: <one paragraph from PLAN.md \`description\`>
dependencies:                    # omit if none
  - <sibling-id this container waits on>
inputs:                          # omit if none
  - <file path the next planner will need>
tags:                            # omit if none
  - <short kebab tag>
---

# <Title>

**Goal**: <one sentence from PLAN.md>

## Scope

<copy the \`scope\` field from PLAN.md verbatim — this is what the
 parent (this node) packs into this child's contract. The next
 planner will read it as part of its scope packet.>

### Inherited context

The next planner reads root → ancestors → me automatically; this list
is a quick orientation for human readers and lowers the chance of the
next planner re-deriving facts already decided. Bullet only the facts
that bind this subtree (max 5 bullets):

- <fact 1, e.g. "Package path: packages/mission-control-server">
- <fact 2, e.g. "Streaming transport: SSE">
- <fact 3, e.g. "Manifest at cli-commands.json (root)">

## Decomposition

This task decomposes further. Run \`converge plan\` at this path to
plan its layer.
\`\`\`
`;

const SEED_BLOCK = `\
\`\`\`yaml
---
id: <child-id from PLAN.md>
title: <human title from PLAN.md>
description: <one paragraph from PLAN.md \`description\`>
dependencies:                    # omit if none
  - <sibling-id this seed waits on>
inputs:                          # omit if none
  - <driver path(s) the seed script reads>
driver:
  type: nodejs
  path: ./index.js
tags:                            # omit if none
  - <short kebab tag>
---

# <Title>

**Goal**: <one sentence from PLAN.md>

## Scope

<copy \`scope\` from PLAN.md verbatim>

## Fan-out

Driven by: <copy \`driver\` description from PLAN.md verbatim>

At runtime, \`index.js\` reads the driver, names children
deterministically, and calls \`ctx.spawn(...)\` per item. Each spawned
child gets its own TASK.md materialized into the journal.

## Per-spawn child shape

Each \`ctx.spawn\` call emits one child with this shape:

- \`id\`: <kebab-slug derivation, e.g. \`slugify(item.name)\`>
- \`title\`: <pattern, e.g. \`"\${commandName} command view"\`>
- \`vars\`:
  - \`<key>\`: <one-line description of what the seed script packs>
  - \`<key>\`: <e.g. "JSON-stringified args array">

The keys above MUST match the keys \`index.js\` packs into
\`ctx.spawn(...).vars\`. Two sources of truth must agree.
\`\`\`
`;
