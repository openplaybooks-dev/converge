# Task: 09-concepts/001-gap-driven-model

# Write `docs/concepts/gap-driven-model.md`

The central paradigm. Reader leaves this page able to explain "what is
gap-driven" to a colleague.

## Required frontmatter

```yaml
---
title: "Gap-driven model"
description: "Define done. Measure the gap to current state. Close the gap. Repeat."
sources:
  - packages/core/src/index.ts
  - packages/core/src/storage/types.ts
sidebar:
  order: 1
---
```

## Required structure

1. **The frame.** Most workflow systems are *imperative*: declare steps, then
   run them. Gap-driven is *declarative*: declare done, let the runtime
   figure out the steps.

2. **Anatomy.** A task has:
   - **target state** — `outputs:` (files that should exist) and `checks:`
     (commands that should pass)
   - **current state** — what exists right now
   The gap is the diff. The agent's job is to close it.

3. **The convergence loop.**
   - Measure: which checks fail? → these are gaps.
   - Plan: what work would close them?
   - Act: do the work.
   - Re-measure. If gap remains, learn (LEARN.md), retry.
   - Loop until all checks pass or max attempts reached.

4. **Why this is different from step-driven.** Compare to LangGraph
   (or any node-and-edge system):
   - Steps assume you know the path. Gaps don't.
   - Steps are brittle to environmental changes. Gaps adapt — if a check is
     already passing because someone fixed it manually, the agent skips that
     work.
   - Steps debug by retracing the graph. Gaps debug by reading which check
     failed.

5. **Trade-offs (be honest).**
   - Less control over *how* work happens. If you need exact step ordering,
     gap-driven is the wrong tool.
   - Checks must be deterministic. Flaky checks make gap-driven thrash.
   - The agent has more latitude — and more cost — than a step runner.

6. **Where in the codebase.** One-line pointer: the gap-detection logic
   lives in `packages/core/src/...`. (Verify the path; if there's a
   `Gap` / `GapDetector` symbol, name it.)

## Read first

- `packages/core/src/index.ts` — confirm `Gap`, `GapDetector` are exported.
  If they are, name them; if not, describe the model without claiming the
  symbols.

## Banned

- Cheerleading. The trade-offs section is non-negotiable; if gap-driven is
  always better, no one would write step-driven systems. We win on a
  specific axis; name it.
- Made-up code paths. Cite real files.