---
title: "Concepts"
description: "The four ideas that distinguish Converge from other agent frameworks"
sidebar:
  order: 0
---

# Concepts

The four ideas that distinguish converge from other agent frameworks. Each page is grounded in real code — every claim points at a file you can read.

Read these in order if you're new; jump in if you know what you're looking for.

1. **[Context interpolation](./context-interpolation.md)** — tasks reference each other through files. Inputs and outputs are the interface contract; each task gets one focused slice while the pipeline stays consistent.
2. **[Deterministic checks](./deterministic-checks.md)** — verification is shell commands, not AI judgement. The contract for "done" is code that runs and returns 0 or 1.
3. **[Dynamic work-breakdown](./dynamic-work-breakdown.md)** — tasks spawn child tasks at runtime via Seed scripts. Scope emerges from the problem instead of being predeclared.
4. **[Strategy-based self-correction](./self-correction.md)** — when a check fails, a pipeline of named repair strategies tries to unblock the task. Different kinds of failures get different kinds of fixes.

## Where these connect

The four concepts compose:

- **Checks** define what done means; **Seed** lets that contract scale to data-dependent shapes; **context interpolation** keeps a multi-task pipeline coherent without shared memory; **self-correction** is what happens when a check fails, dispatching the failure to a targeted repair before falling back to retry.
- A failing check produces a `LEARN.md`. That file is the input to the next attempt — that's context interpolation in its smallest form. If a strategy claims the failure first, you never see the LEARN.md path; if no strategy claims it, the AI takes over with the carried-forward analysis.

If you want the operational side instead, see [Guides](../guides/) for problem-shaped how-tos or [Reference](../reference/) for schema-level detail.

If you want the engineering case rather than the user model — the navigator graph, the strategy catalog, the correctness primitives that make this safe to run unattended — see [Advanced](../advanced/).
