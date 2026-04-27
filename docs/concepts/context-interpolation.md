---
title: "Context interpolation"
description: "Tasks reference each other through files. Each task gets one focused slice of the problem; the pipeline stays consistent because every reference is on disk."
sidebar:
  order: 1
---

## The problem: how do you split a big problem without losing coherence?

A non-trivial project doesn't fit in one prompt. You decompose it: research → plan → implement → test → document. The problem with naive decomposition is that each task either gets *too much* context (the whole project, every time, blowing the prompt window and confusing the model) or *too little* (just the immediate instruction, with no awareness of upstream decisions, leading to drift between tasks).

The traditional answer is shared memory: a database, a vector store, a message bus that all tasks read from and write to. That solves visibility but creates new problems — opaque state, schema drift, "what did task A actually pass to task B" debugging that has no `cat` answer.

Converge picks a different answer: **interpolate context between tasks through plain files.** Each task declares the inputs it needs and the outputs it produces. Downstream tasks read upstream outputs as their inputs. The filesystem itself is the interface contract.

## How it works

Every task in TASK.md frontmatter declares two things:

```yaml
inputs:
  - docs/_cli-commands.json       # what it needs to read
  - packages/cli/src/main.ts
outputs:
  - docs/reference/cli/index.md   # what it must produce
```

Before the task runs, the framework snapshots every declared input — file paths, mtimes, sizes — into the per-attempt context. The agent's prompt explicitly tells it: *here are your inputs; here are the outputs you must produce.*

After the task runs, its outputs become available to downstream tasks. If task B lists `docs/_cli-commands.json` (an output of task A) as an input, task B's prompt automatically references the same file task A wrote. No queue, no broker, no shared memory — just `inputs:` pointing at `outputs:`.

This means:

- **Each task sees only its slice.** The CLI documentation task doesn't know what the marketing-page task did. It doesn't need to. It needs `docs/_cli-commands.json` (the output of an earlier source-scan task) and `packages/cli/src/main.ts`. Nothing else.
- **Coherence is enforced by the file references, not by the model.** If two tasks agree on a file path, they agree on the data. There's no telephone-game where the model summarizes upstream work for downstream tasks and drifts.
- **The pipeline is inspectable.** `cat docs/_cli-commands.json` shows you exactly what the documentation task is reading. No SQL query needed.

## Beyond inputs/outputs: facts and ancestor context

Files cover the structural references — "task B reads what task A wrote." But sometimes a task needs softer information: *what choice did the upstream task make, and why?* Those don't fit cleanly into a file output.

Converge adds two complementary mechanisms:

- **Facts.** A task can write structured key-value facts to its `facts.jsonl`. Descendant tasks read parent and ancestor facts as part of their context — without re-deriving them. Example: a planning task records `selected_framework: vitest` as a fact; downstream test-writing tasks read it instead of re-deciding.
- **Ancestor summaries.** Each task that completes leaves a short summary of what it produced. A child task running deep in the tree gets a chain of "what each ancestor decided" so it inherits the context of its position without needing the whole tree's outputs in its prompt.

Together these three layers — declared inputs/outputs, facts, ancestor summaries — let you carve a complex problem into focused tasks while keeping the whole thing consistent.

## Carrying context across attempts (the special case)

When a task fails and retries, the same interpolation mechanism does double duty: the *next attempt of the same task* is treated as a downstream task whose inputs include the previous attempt's wip directory. So the next attempt receives:

- The original `inputs:` (still pointing at upstream task outputs).
- A `LEARN.md` from the previous attempt — what checks failed, with their stdout/stderr.
- A `FEEDBACK.md` with the structured check-results.
- Loop-detector hints if the previous attempt thrashed.
- A `BUGGY_CHECK.md` proposal if the agent flagged the predicate as the bug. (See [Strategy-based self-correction](/concepts/self-correction/).)

This is the same pattern at smaller scale: failure analysis is just another file the next "task" (the next attempt) reads as input.

## Why this matters for the problem-solver

The two failure modes of decomposition:

1. **Context starvation.** Task B doesn't know what task A produced; it makes assumptions; the assumptions don't match; the pipeline produces incoherent work. Most ad-hoc multi-agent setups hit this.
2. **Context overload.** Every task gets the whole project in its prompt; the model gets confused; you blow the context window; cost balloons.

Converge avoids both because the contract is *file-shaped*: precise enough to reference exactly what's needed, scoped enough to leave the rest out, inspectable enough to debug when something drifts.

The practical consequence: you can take a problem that doesn't fit in one model call and split it across 30 tasks without losing coherence. Each task is a focused prompt with focused inputs; the *connections* between tasks are recorded on disk where you (and the framework) can verify them.

## Trade-offs

- **You have to declare inputs and outputs accurately.** A task that writes a file but doesn't list it under `outputs:` won't surface to downstream tasks. A task that reads a file but doesn't list it under `inputs:` won't have it snapshotted (or seen by the framework as a real dependency).
- **File-shaped interfaces don't fit everything.** "What did task A *think* about the data" is hard to capture in a file output. That's what facts and ancestor summaries fill in, but they're a coarser tool.
- **Stale references cost time.** If task A's output changes after task B has read it, task B doesn't automatically re-run. Re-running is the framework's job (via dependency tracking) — but if the dependency isn't declared, you get drift between what's on disk and what task B remembers.
- **Token cost still grows with the number of inputs.** A task that lists 30 inputs has all 30 paths in its context. Filesystem-as-interface is cheap on infrastructure but not on tokens — keep input lists tight.

## Where this lives in the codebase

- `packages/core/src/task/lifecycle/before.ts` — snapshots declared inputs at the start of each attempt; produces the `InputSnapshot` the agent reads.
- `packages/core/src/task/lifecycle/context-snapshot.ts` — assembles the per-attempt context bundle (TASK.md, CHECK.md, LEARN.md, prior outputs) that's mounted into the agent's prompt.
- `packages/core/src/task/facts/api.ts` — the facts API: `ctx.facts.set(...)` writes structured facts; descendant tasks load parent facts via `loadParentFacts`.
- `packages/core/src/task/lifecycle/learn.ts` — generates the cross-attempt context (LEARN.md) so a failed attempt becomes input to the next attempt of the same task.
- `packages/core/src/task/lifecycle/after.ts` — captures the file diff that becomes the upstream artifact for downstream tasks.

If you want to see interpolation between tasks, pick any task and run `cat <task>/inputs.json` (the snapshot) — every path you see there was produced by an upstream task, and every path the task writes will appear in some downstream task's snapshot.

For the engineering view of how the framework grounds these snapshots in filesystem truth — and why mtime+size is the right proxy for change detection — see [Advanced: input snapshot and file diff](../advanced/03-input-snapshot-and-diff).
