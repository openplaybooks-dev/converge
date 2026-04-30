---
title: "Advanced"
description: "The engineering case for Converge — runtime architecture, correctness primitives, and the design choices that distinguish it from prompt-wrapper frameworks."
sidebar:
  order: 0
---

# Advanced

This category is for the question senior engineers ask before adopting a framework: *is the runtime real?*

The [Concepts](../concepts/) section explains the user-facing model — what you think about when you write a playbook. The [Reference](../reference/) section gives you the schema-level detail. This section is different. Each page picks one piece of the engineering, opens with the failure mode naive frameworks have, then shows the technique Converge uses, with file:line refs you can read directly.

The aim isn't to teach you the API. It's to make the design choices visible so you can judge them.

## Reading order

These pages stack. Read top to bottom on a first pass; jump in if you know what you're looking for.

1. **[The navigator graph](./01-navigator-graph)** — how the convergence loop is structured. Most agent frameworks are switch statements with a retry loop; Converge is an event-sourced action graph that *is* its own checkpoint.

2. **[Just-in-time graph construction](./02-jit-graph-construction)** — the graph isn't pre-built. Nodes are injected on-demand as gaps appear, keeping the runtime traceable instead of letting it explode combinatorially.

3. **[Context as a vector space](./03-input-snapshot-and-diff)** — the user's idea is a seed vector. Each task extends it; each task projects a slice of it. The filesystem is the offload — the vector space lives on disk, not in the context window.

4. **[The strategy catalog](./04-strategy-catalog)** — how the repair pipeline scales. A flat registry of named strategies with declarative context steps, not an orchestrator with hard-coded dispatch.

5. **[Runtime hygiene](./05-runtime-hygiene)** — atomic writes, per-attempt isolation, PID-based playbook locks, atomic WBS spawn. The unglamorous primitives that prevent two-week-old runs from corrupting on a power loss.

6. **[Task execution context](./06-attempt-folder)** — each task run lives in its own directory the agent can read, write, and look back across. Prior attempts are preserved by default; the agent can read them to learn from earlier mistakes without inventing a state-passing protocol.

7. **[dbt shaped Converge](./07-dbt-shaped-converge)** — the engineering decision behind the v2 CLI surface. Why dbt was the reference point, which concepts were adopted, where the analogy stops working, and the open questions still under review.

## What this section is not

- **Not API docs.** Use [Reference](../reference/) for schema and CLI specifics.
- **Not how-to.** Use [Guides](../guides/) for problem-shaped recipes.
- **Not prerequisite reading.** You can write Converge playbooks without ever opening this section. It exists for the people who need to know how the floor was built before they stand on it.

## Where the proof lives

Every claim on these pages is anchored to a `packages/core/src/...` or `packages/cli/src/...` path with line numbers. If a claim and the code disagree, the code is right and the docs are stale — open an issue. The whole point of this section is that nothing here is asserted; everything is referenced.
