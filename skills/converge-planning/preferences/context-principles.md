# Context Principles

Three foundational principles that govern how converge-planning decomposes problems, passes context between tasks, and manages information scale.

---

## Principle 1: Progressive Enrichment

**Decompose complex problems recursively. Each phase refines context from the previous.**

### How It Works

The planning pipeline is a series of enrichment layers:

```
Raw project directory
  → Phase 1 (Analyze): broad scan → analysis.md
    → Phase 2 (Discover): narrow to what matters → requirements.md
      → Phase 3 (Architect): structure into executable plan → playbook.yml + tasks/
        → Phase 4 (Validate): verify completeness → approved plan
```

Each phase takes the prior phase's output as input, enriches it with new information, and produces a more refined artifact. No phase tries to do everything — it does one enrichment step well.

### Recursion Within Phases

The same principle applies inside Phase 3 (Architect):

- **Tasks** decompose the project recursively — any task can have children
- **WBS** further decomposes tasks into N similar children from data

Tasks nest arbitrarily deep. Each level adds specificity: higher-level tasks define scope, leaf tasks define work, WBS spawns instances.

### Retry as Enrichment

When a task fails and retries, the retry is an enrichment cycle:

```
Attempt 1 fails → FEEDBACK.md captures what went wrong
  → LEARN.md captures reusable lessons
    → Attempt 2 starts with enriched context (original + feedback + learnings)
```

The retry isn't starting over — it's building on what was learned.

### Anti-Patterns

- **Skipping phases** — Jumping from raw project to architect loses the enrichment from analysis and discovery
- **Mega-phases** — One phase that tries to analyze + discover + architect collapses the enrichment layers
- **Ignoring prior output** — A phase that doesn't read the previous phase's artifact wastes the enrichment chain

---

## Principle 2: Context Interpolation

**Explicit context contracts between tasks so each executor has exactly what it needs.**

### Context Contracts

Every task defines two sides of a context contract:

```yaml
inputs:    # Context In — what this task reads from upstream
  - .converge/requirements.md
  - .stitch/screens.json
outputs:   # Context Out — what this task produces for downstream
  - src/screens/Home.tsx
  - src/screens/Home.module.css
```

`inputs` are the **Context In**: files this task reads. They must be produced by an upstream task's outputs.

`outputs` are the **Context Out**: files this task creates. They become available as inputs for downstream tasks.

### Minimal Context Rule

Give each task the **minimum context** it needs to execute. An over-broad input list (e.g., `src/**/*`) means the task's context boundary is unclear — it could depend on anything.

Good:
```yaml
inputs:
  - .converge/requirements.md
  - .stitch/design-system.json
```

Bad:
```yaml
inputs:
  - .converge/*
  - src/**/*
```

### Tracing Context Chains

Context flows through tasks like a pipeline. You should be able to trace any output back to its inputs:

```
analysis.md → requirements.md → playbook.yml → TASK.md (spec)
                                                    ↓
                                              screen-spec.md → design.html → Component.tsx
```

If a task's input doesn't trace back to an upstream output, the chain is broken. If a task's output is never consumed downstream, it may be unnecessary (flag it, don't delete — it may serve as documentation).

### Anti-Patterns

- **Orphan inputs** — Task reads a file no upstream task produces (broken chain)
- **Over-broad inputs** — `src/**/*` when the task only needs one file (unclear boundary)
- **Hidden dependencies** — Task reads files not listed in its inputs (undeclared context)
- **Orphan outputs** — Task produces files nothing downstream consumes (flag for review)

---

## Principle 3: Context Offloading

**Use files instead of large prompts. MD for specs, JSON for state, skills for instructions.**

### Why Offload

AI executors have context limits. Stuffing everything into a prompt hits those limits and degrades quality. Instead, offload context into typed files and reference them.

### File Type Guide

| Type | Use For | Examples |
|------|---------|---------|
| **Markdown (.md)** | Specs, requirements, instructions, human-readable context | `requirements.md`, `TASK.md`, `FEEDBACK.md` |
| **JSON (.json)** | Structured data, state, machine-readable context | `screens.json`, `check.json`, `convergence.json` |
| **JSONL (.jsonl)** | Event logs, append-only streams | `events.jsonl`, `facts.jsonl` |
| **TASK.md body** | Step-by-step execution instructions | Task body content |
| **Skills** | Reusable instruction sets | `skills:` field in TASK.md |

### When to Inline vs Offload

| Context Size | Approach |
|-------------|----------|
| < 10 lines | Inline in TASK.md body or `executor.prompt` |
| 10-50 lines | Reference a file via `inputs` |
| > 50 lines | Must be in a file — never inline |
| Reusable across tasks | Put in a skill or preference file |

### Execution Artifacts as Offloading

The converge execution system already implements this principle:

| Artifact | What It Offloads |
|----------|-----------------|
| `NEEDS.md` | Pre-execution environment check — offloads dependency verification from the task prompt |
| `CHECK.md` | Post-execution validation — offloads quality criteria from the task prompt |
| `FEEDBACK.md` | Failure analysis — offloads retry context from the executor's memory |
| `LEARN.md` | Reusable lessons — offloads cross-attempt knowledge from individual retries |
| `facts.jsonl` | Discovered truths — offloads runtime facts from the execution log |

Each artifact stores one type of context in the right format, keeping the executor's prompt focused on the current task.

### Anti-Patterns

- **Prompt stuffing** — Putting the entire spec, design system, and requirements into one prompt
- **Missing references** — Instructions say "follow the design system" but don't specify which file
- **Wrong format** — Structured data in markdown (use JSON), or step-by-step instructions in JSON (use markdown)
- **Duplicate context** — Same information in the prompt AND in a referenced file (pick one)
