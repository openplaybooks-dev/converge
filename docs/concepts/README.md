---
title: "Concepts"
description: "The core ideas that distinguish Converge from other agent frameworks"
sidebar:
  order: 0
---

# Concepts

Converge is built on one standard, one core pattern, four supporting ideas, and a code-first orchestration layer. Each page is grounded in real code: every claim points at a file you can read.

Read these in order if you're new; jump in if you know what you're looking for.

## [The playbook](./playbook)

The foundational standard. A playbook is a complete specification for work: it defines the target state, the method, and the verification. Skills supply reusable execution techniques; playbooks compose them into runnable specifications. Every other concept builds on this. [Read the full page →](./playbook)

## [Convergence](./convergence)

The core pattern. Every task too large for a single step follows the same rhythm: **diverge, let children execute, converge.** A parent splits into sub-tasks, they run independently, and the parent integrates their results. In the DAG, a container becomes two nodes: `{id}-diverge` and `{id}-converge`. [Read the full page →](./convergence)

## Four supporting ideas

1. **[Context interpolation](./context-interpolation.md)**: tasks reference each other through files. Inputs and outputs are the interface contract; each task gets one focused slice while the pipeline stays consistent.
2. **[Deterministic checks](./deterministic-checks.md)**: verification is shell commands, not AI judgement. The contract for "done" is code that runs and returns 0 or 1.
3. **[Dynamic work-breakdown](./dynamic-work-breakdown.md)**: tasks spawn child tasks at runtime via Seed scripts. Scope emerges from the problem instead of being predeclared.
4. **[Task self-correction](./task-self-correction.md)**: when a check fails, a pipeline of named repair strategies tries to unblock the task. Different kinds of failures get different kinds of fixes.

## [Workflows](./workflow.md)

The code-first layer. Orchestration written as a visible, resumable `workflow.js` program — fully compatible with Claude Code's workflow API — that runs your real `TASK.md` tasks. It's *optional*: it coexists with `playbook.yml` and overrides only how tasks are orchestrated, with durable mid-flight resume over a step journal. [Read the full page →](./workflow)

## Where these connect

The concepts compose around the playbook and convergence:

- **The playbook** is the container: the contract that declares tasks, their files, and their checks. Everything else executes within a playbook.
- **Diverge→converge** is the structural pattern: how work fans out and integrates back.
- **Checks** define what done means at each level; **Seed** lets the fan-out scale to data-dependent shapes; **context interpolation** keeps a multi-task pipeline coherent without shared memory; **task self-correction** is what happens when a check fails, dispatching the failure to a targeted repair before falling back to retry.
- A failing check produces a `LEARN.md`. That file is the input to the next attempt: that's context interpolation in its smallest form. If a strategy claims the failure first, you never see the LEARN.md path; if no strategy claims it, the AI takes over with the carried-forward analysis.

If you want the operational side instead, see [Guides](../guides/) for problem-shaped how-tos or [Reference](../reference/) for schema-level detail.

If you want the engineering case rather than the user model: the navigator graph, the strategy catalog, the correctness primitives that make this safe to run unattended: see [Advanced](../advanced/).

For the canonical name index — every API, CLI verb, env var, on-disk path, frontmatter field, and concept that's current today, plus a legacy→canonical drift table with ready-to-run greps — see [GLOSSARY.md](../GLOSSARY.md).
