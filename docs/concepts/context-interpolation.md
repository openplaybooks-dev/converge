---
title: "Context interpolation"
description: "Tasks reference each other through files. Each task gets one focused slice of the problem; the pipeline stays consistent because every reference is on disk."
sidebar:
  order: 2
---

## You're painting a picture. Each viewpoint is limited.

Imagine the project as a single picture you're trying to paint. The picture is too big to see all at once — at any moment, you can only look at a small rectangle of canvas. To finish the picture, you have to make a sequence of moves: pick a viewport, see what's already there, paint a piece, move the viewport, repeat.

Converge models a project the same way. **The work is a set of static dots — tasks — scattered across a canvas of files. Each task gets a viewport: a small, focused slice of the canvas it can see and a small, focused slice it's responsible for filling in. Converge's job is to connect the dots — to find an order of viewports such that each task, looking only at its slice, can produce the next piece of the picture.**

The mechanism is mundane on purpose: the canvas is the filesystem; viewports are declared input/output globs; "connecting" is computing which produced files feed which downstream task's viewport. No vector store, no shared memory, no per-call replay of the whole picture. Files in, files out, and a runtime that schedules viewports.

<figure class="cv-figure" role="img" aria-labelledby="cv-fig-title cv-fig-desc" style="margin: 1.5rem 0;">
  <svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" class="cv-svg" style="width: 100%; max-width: 720px; height: auto; display: block;">
    <title id="cv-fig-title">The picture, the dots, and three viewports</title>
    <desc id="cv-fig-desc">
      A wide canvas with seven scattered task dots. Three labeled viewport rectangles overlap
      different regions of the canvas. Arrows from finished dots feed into the next viewport,
      illustrating how each task's output extends the slice the next task can see.
    </desc>
    <defs>
      <pattern id="cv-grid" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
        <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#1E293B" stroke-width="1" opacity="0.55"/>
      </pattern>
      <radialGradient id="cv-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#6366F1" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#6366F1" stop-opacity="0"/>
      </radialGradient>
      <marker id="cv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366F1"/>
      </marker>
    </defs>

    <!-- canvas (the full picture) -->
    <rect x="0" y="0" width="720" height="360" fill="url(#cv-grid)" rx="12"/>
    <rect x="0" y="0" width="720" height="360" fill="url(#cv-glow)" rx="12"/>
    <text x="20" y="28" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="#64748B" letter-spacing="0.16em">THE PICTURE — files on disk</text>

    <!-- task dots (static, scattered) -->
    <g fill="#94A3B8">
      <circle cx="120" cy="110" r="6"/>
      <circle cx="220" cy="160" r="6"/>
      <circle cx="180" cy="240" r="6"/>
      <circle cx="370" cy="130" r="6"/>
      <circle cx="430" cy="220" r="6"/>
      <circle cx="560" cy="160" r="6"/>
      <circle cx="610" cy="270" r="6"/>
    </g>
    <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#64748B">
      <text x="132" y="113">research</text>
      <text x="232" y="163">plan</text>
      <text x="192" y="243">facts</text>
      <text x="382" y="133">scaffold</text>
      <text x="442" y="223">impl</text>
      <text x="572" y="163">tests</text>
      <text x="498" y="282" text-anchor="end">docs</text>
    </g>

    <!-- viewport 1 -->
    <rect x="80" y="78" width="200" height="190" rx="10" fill="none" stroke="#22D3EE" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.85"/>
    <text x="90" y="94" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#22D3EE" letter-spacing="0.12em">VIEWPORT A — research + plan</text>

    <!-- viewport 2 -->
    <rect x="320" y="100" width="180" height="160" rx="10" fill="none" stroke="#A78BFA" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.85"/>
    <text x="330" y="116" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#A78BFA" letter-spacing="0.12em">VIEWPORT B — scaffold + impl</text>

    <!-- viewport 3 -->
    <rect x="520" y="130" width="180" height="170" rx="10" fill="none" stroke="#6366F1" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.95"/>
    <text x="530" y="146" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#6366F1" letter-spacing="0.12em">VIEWPORT C — tests + docs</text>

    <!-- connection arrows: A's outputs feed B's slice, B's outputs feed C's slice -->
    <path d="M 250 180 C 290 180, 300 160, 330 160" fill="none" stroke="#6366F1" stroke-width="1.6" marker-end="url(#cv-arrow)"/>
    <path d="M 470 200 C 510 200, 510 200, 540 200" fill="none" stroke="#6366F1" stroke-width="1.6" marker-end="url(#cv-arrow)"/>

    <!-- caption -->
    <text x="360" y="340" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="#94A3B8" letter-spacing="0.06em">
      each viewport sees a slice · each task produces files · produced files extend the next viewport
    </text>
  </svg>
  <figcaption class="cv-caption" style="font-size: 0.875rem; color: var(--sl-color-gray-3, #94A3B8); margin-top: 0.75rem; line-height: 1.5;">
    The picture is the project on disk. The dots are tasks — fixed in place once declared.
    Each viewport is one task's <code>inputs:</code>/<code>outputs:</code> declaration: a slice
    it can read, a slice it must write. Connecting the dots is computing the order in which
    viewports unlock each other.
  </figcaption>
</figure>

## The two failure modes this avoids

The reason "every viewport is limited" matters: any naive decomposition collapses into one of two failure modes.

1. **The viewport is the whole picture.** Every task sees everything. Window blows; cost balloons; the model loses focus across irrelevant detail. This is what happens when you stuff the entire project into each prompt because you're afraid of losing context.
2. **The viewports don't overlap.** Each task sees only its immediate instruction, with no awareness of what upstream tasks decided. Tasks make incompatible assumptions; the pieces don't fit. This is what happens when you decompose without a shared addressing scheme.

The fix is a viewport that is *small but precisely chosen*: large enough to contain everything the task needs to read, small enough that nothing irrelevant fits, and with a stable address (a file path) for every coordinate. That's what `inputs:` and `outputs:` are.

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
