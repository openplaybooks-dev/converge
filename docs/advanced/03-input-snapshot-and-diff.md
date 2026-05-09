---
title: "Context as a vector space"
description: "An idea is a seed vector. Each task projects a slice of it into the agent's prompt. The filesystem is the offload: the vector space lives on disk, not in the context window."
sidebar:
  order: 3
---

## The context window is the wrong unit

Most agent frameworks treat the context window as the workspace. Everything the agent might need: instructions, inputs, prior reasoning, examples: gets packed into one prompt before each call. The window is the working set; what doesn't fit gets summarized away.

This breaks for any non-trivial workflow.

**It doesn't compose.** When the work spans 50 tasks across an hour of runtime, the union of relevant context is hundreds of times the window size. Aggressive summarization throws away exactly the specifics later tasks need (a path, a parameter, a dropped consideration). Lossless inclusion blows the window.

**It hides structure.** Every prompt has to declare what's in it. There's no shared schema across tasks. The system prompt becomes a 4000-token preamble that re-explains the project on every call, half of which is irrelevant to the task at hand.

**It's not addressable.** When a downstream task wants "what did task A decide about the data shape," there's no handle for that. You either pre-summarize during task A and hope you summarized the right things, or you replay task A's transcript: both lossy.

The frame Converge uses is different. **Treat context as a vector in a high-dimensional space whose coordinates live on the filesystem.** The user's idea is a seed vector. Each follow-up: a child task, a sibling, a repair attempt: extends the vector by writing to disk. Each individual task projects a *slice* of the vector into its own prompt: only the dimensions it declares interest in.

The window stops being the workspace. The window becomes a viewport.

## The vector space, made concrete

The "vector space" isn't a metaphor reaching for cosine similarity. It's a literal addressing scheme. Every datum the system might want has a stable filesystem path, and every task declares which paths it depends on. Three layers compose to make this work:

### 1. The seed vector: the user's idea

A playbook starts with a seed: a problem statement, a target description, often a literal `idea.md` or `README.md` at the project root. This is the root coordinate. Every task in the playbook is, transitively, an extension of it.

The seed isn't special: it's just the first thing on disk that other tasks declare as input. A pentest playbook's seed might be `scope.yml`. A film playbook's seed is `idea.md`. A research playbook's seed is the question string captured in `playbook.yml` vars. Each of these is one or more files the agent didn't write but every task can read.

### 2. Vector extension: each task writes new dimensions

When a task runs, it produces files. Those files become new dimensions of the project's vector space, available to any downstream task that names them.

Critically, the framework also writes *meta* files alongside the agent's outputs:

- `attempts/<NN>/data/needs.json`: what this task asked for, machine-readable. (`packages/core/src/task/lifecycle/context-snapshot.ts:94`)
- `attempts/<NN>/data/check.json`: what this task asserted as success. (`context-snapshot.ts:95`)
- `attempts/<NN>/data/before.json` and `after.json`: file-state snapshots before and after the agent ran (the diff is what proves what changed; see [Where the diff lives](#where-this-lives) below).
- `attempts/<NN>/LEARN.md`: what this task figured out, including from failed prior attempts. (`context-snapshot.ts:96`)
- `summary.md`: a downstream-friendly distillation of the task's outcome.

These are the *latent* coordinates. The agent didn't author them; the framework derives them. Future tasks that need "what did this branch of the work decide" don't have to re-read transcripts: they read the meta files.

### 3. Per-task projection: each task sees only its slice

Every TASK.md declares its inputs (file globs) and its outputs. Those declarations are not just contracts for verification: they are **slicing operations on the vector space**. The framework uses them to assemble the per-task prompt.

The prompt builder at `packages/core/src/task/lifecycle/prompt-builder.ts:54` (`buildEnrichedPrompt`) composes the agent's view from six sections:

```
[CONTEXT FROM PRIOR TASKS]      ← ancestor summaries + sibling outcomes
[TASK INSTRUCTIONS]              ← SKILL.md body
[INPUTS AVAILABLE]               ← declared inputs, resolved to actual files
[OUTPUTS REQUIRED]               ← declared outputs, with existence status
[CHECKS TO PASS]                 ← shell predicates that must exit 0
[GAPS]                           ← compact failure summary if this is a retry
```

That ordering matters. The agent first sees *where it is in the project graph* (context), then *what it's being asked to do* (instructions), then *the materialized slice of the vector space it has access to* (inputs/outputs). The agent never sees the whole vector space: only the projection the task asked for.

When the input set is large (>30 files, `prompt-builder.ts:83`), the framework switches to file-index mode: paths only, no inline content. The agent reads what it needs on demand. **The window is a viewport, not a workspace.**

## Vector extension across the ancestry

The most interesting projection is the one that crosses task boundaries. A child task doesn't just see its declared inputs; it sees a structured digest of its ancestors and siblings.

`packages/core/src/task/lifecycle/context-propagation.ts:54` defines `loadAncestorContext`, which produces three things:

```typescript
// context-propagation.ts:38
export interface AncestorContext {
  ancestorSummaries: AncestorSummary[];   // up to 2 levels up
  siblingOutcomes: SiblingOutcome[];       // up to 10 completed siblings
  correctionHistory?: string;              // compressed prior attempts of this task
}
```

Each `AncestorSummary` carries a depth (`1 = parent, 2 = grandparent`), the first 800 chars of the ancestor's `summary.md`, and the list of files the ancestor produced (`context-propagation.ts:23`). Each `SiblingOutcome` carries the sibling's `filesCreated` and a `summarySnippet` from its outcome JSON (`context-propagation.ts:31`).

This is the **vector extension** mechanism. When a follow-up task runs, the seed vector has already been extended N times: each extension being a sibling or ancestor task that produced files and a summary. The current task's prompt is constructed by *projecting* the relevant slice of those extensions onto the current task's interests.

Two practical consequences:

- **Sibling order matters but is bounded.** Siblings are loaded in numeric order, capped at 10 (`context-propagation.ts:85`). Tasks named with leading numbers (`001-recon`, `002-intel`, `003-sweep`) form a deterministic projection sequence: task `003` sees the outcomes of `001` and `002` as part of its viewport, never the other way around.
- **Ancestry is shallow on purpose.** Only two levels by default (`context-propagation.ts:58`). Deeper ancestry would re-introduce the "stuff the whole project into the window" failure mode. The depth limit is a feature; if a task needs detail from a great-grandparent, it should declare the relevant file as an input directly.

## Selective projection: the Meta-Converge optimization

A task that runs three times (initial attempt, two repair attempts) doesn't see the same projection each time. The repair pipeline produces *gaps*: structured failure descriptions: and the prompt builder uses them to narrow the projection.

```typescript
// prompt-builder.ts:81–97
const useFileIndex =
  fileIndexMode ??
  inputSnapshot.inputs.reduce((n, inp) => n + (inp.files?.length ?? 0), 0) > 30;
const manifestLines = await buildInputManifest(projectDir, inputSnapshot, {
  currentGaps,
  fileIndexMode: useFileIndex,
});
```

When `currentGaps` is provided, the manifest builder tags only the inputs that touch the failed dimensions, and the checks section shows only the failing checks (`prompt-builder.ts:106`). The agent's viewport on retry is *narrower* than its viewport on the first attempt: focused on exactly the slice that needs work.

This is what makes long playbooks tractable. A task that has been retried four times against a 200-file input set isn't re-shown 200 files on attempt five. It's shown the three files relevant to the gap that's still open, plus the LEARN.md it accumulated across the prior four attempts (`context-snapshot.ts:101–108`).

## Filesystem as offload

The reason this works at all is that the filesystem is doing the heavy lifting. The vector space isn't in the context window: it isn't in any single process's memory. It's on disk, addressable by path, durable across crashes.

Three properties matter:

1. **Stable addresses.** `outputs/cast/character-001.json` means the same thing across attempts, sessions, and machines. There's no per-run UUID or content hash standing between a task and the file it wants. Every projection in the system is "give me these paths," not "give me the latest version of this concept."
2. **Lazy materialization.** The agent doesn't get file contents inline unless the projection asks for them. In file-index mode, the prompt is *paths*; the agent uses tools to read the bytes only of the files it actually opens. Token cost scales with attention, not with corpus size.
3. **Append-only history.** Prior attempts aren't overwritten: they live at `attempts/01/`, `attempts/02/`, etc. (see [Task execution context](./06-attempt-folder)). The vector space accumulates every projection ever made; nothing is destructively summarized.

The trade Converge makes is explicit: spend `stat` syscalls and a kilobyte of JSON per task to keep the window small and the addressing stable. That trade pays back enormously on long runs, where the alternative is a context window that grows linearly with project age until it's useless.

## Where this lives

- **Seed vector and per-task projection**: `packages/core/src/task/lifecycle/context-snapshot.ts:70` (`writeContextSnapshot`). Materializes `NEEDS.md`, `NEEDS.result.md`, `TASK.md`, `CHECK.md`, `data/needs.json`, `data/check.json` for each attempt.
- **Vector extension across ancestry**: `packages/core/src/task/lifecycle/context-propagation.ts:54` (`loadAncestorContext`). Walks ancestors and siblings, returns `AncestorSummary[]`, `SiblingOutcome[]`, and prior correction history.
- **The viewport composer**: `packages/core/src/task/lifecycle/prompt-builder.ts:54` (`buildEnrichedPrompt`). Six sections, gap-aware selection, file-index fallback above 30 files.
- **Filesystem-grounded change detection**: `packages/core/src/task/lifecycle/before.ts` and `after.ts`. The before/after snapshot pair proves what the agent actually wrote, regardless of what it claimed (the lower layer that makes path-stable addressing trustworthy).
- **On-disk artifacts you can inspect**: `.converge/journal/<playbook>/tasks/<task>/attempts/<NN>/{NEEDS.md,TASK.md,LEARN.md,summary.md,data/*}` for any task you've run.

## How this compares

**RAG (retrieval-augmented generation).** RAG also offloads context to an external store, but the addressing is *similarity-based*: the system looks up "what's near this query" in an embedding space. Powerful when the query and the corpus are unstructured (chat over a codebase, Q&A over a doc set). Wrong when the workflow itself is structured. A research playbook's `004-aggregation` task doesn't want "the most similar chunks" from across the project: it wants the four specific files its three sibling tasks produced. Path-based addressing is precise where embedding-based addressing is approximate.

**Long-context models.** Frontier models with 1–2M token windows make "stuff the whole project in the prompt" feel viable for medium runs. It works until the run is long enough or the corpus is wide enough that even the long window saturates: and on every model call you're paying for tokens the task doesn't need to see. Long context is a fallback for when projections were poorly chosen, not a substitute for projecting well in the first place.

**Frameworks with shared blackboards (LangGraph state, CrewAI memory).** A shared blackboard is closer to the right shape: it's a structured store the runtime can address. The differences are scope and durability. Blackboards typically live in process memory, are pruned aggressively to fit the window, and have no notion of "what did attempt 3 of this task think versus attempt 4." The Converge equivalent: the journal: is on disk, append-only across attempts, and the projection is computed fresh per task from declared inputs rather than baked into a shared schema.

**Bazel-style content-addressed builds.** Closer architecturally than it looks. Bazel projects are also vector spaces of files with declared dependencies, and Bazel does aggressive projection (only the action's declared inputs are visible). The differences are the granularity (per-action vs per-task) and the threat model (Bazel hashes contents because reproducibility across machines matters; Converge uses mtime+size because change detection is the objective, not byte-equivalence).

## When this matters for your work

You'll feel it when a 100-task playbook takes the same time per task at task #99 as at task #5: context cost stays flat because each task projects only its slice.

You'll feel it when you read `.converge/journal/.../attempts/03/TASK.md` and see exactly what the agent saw on its third attempt: the same prompt, byte-for-byte, that was sent to the model. The viewport is reproducible because it's a file.

You'll feel it most when you change one upstream task and re-run downstream. Only the tasks whose projections actually changed (whose declared inputs were modified) re-execute. The vector space is incremental; the projections are incremental; the work is incremental.

For the next layer: what happens when a task's projection contains a failed sibling or a missing input, and how the framework decides what to do about it: see [The strategy catalog](./04-strategy-catalog).
