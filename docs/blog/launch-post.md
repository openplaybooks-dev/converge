# We've Been Building AI Agents Wrong. Here's Why.

Every AI agent framework starts with the same question: *How should the agent do the work?*

Define a graph. Assign roles. Write a conversation loop. Carefully choreograph each step the agent should take, in what order, with what tools.

But here's the thing — you already know what "done" looks like. The README exists. The tests pass. The schema validates. The report has the right sections. You can describe the destination precisely. So why are you hand-drawing the map?

## The Status Quo

Current frameworks model agent work in three ways, each with the same fundamental limitation.

**Graph-based** (LangGraph): You define nodes and edges — a state machine the agent traverses. Fine-grained control, but the topology is static. Adding self-correction means bolting retry nodes onto the graph. Dynamic task generation requires workarounds. And there's no built-in concept of "done" beyond reaching a terminal node.

**Role-based** (CrewAI): You assign agents personas — researcher, writer, reviewer — and delegate tasks. Intuitive when work maps to roles, but the abstraction breaks down for business workflows that aren't agent-shaped. Task structure is flat. Self-correction is "hand it to another agent."

**Conversation-based** (AutoGen): Agents talk to each other and the workflow emerges from the conversation. Flexible for exploration, unpredictable for production. Agents loop, go off-topic, or fail to converge. No structured verification of outputs.

All three approaches require you to specify **how**. What if you could just specify **what**?

## A Different Approach: Gap-Driven Convergence

What if you just defined "done"?

Not the steps. Not the graph. Not the agent roles. Just: *what does the finished state look like, and how do I verify it?*

This is gap-driven convergence. The loop is simple:

1. **Measure the gap** — compare current state to target state
2. **Generate work** — produce tasks that close the gap
3. **Execute** — run the task
4. **Verify** — run deterministic checks (shell commands that exit 0 or 1)
5. **Learn** — if checks fail, write a structured analysis of what went wrong
6. **Repeat** — next attempt reads the failure analysis and applies targeted corrections

The closest analogy is Terraform or SQL: declare the desired end state, and the engine figures out the execution plan. Except instead of infrastructure or data, the target state is *work product* — files, code, documents, validated data.

## Introducing Converge

Converge is an open-source framework for gap-driven AI agent orchestration. TypeScript-native. 270 lines of core logic. Apache 2.0 licensed.

You define playbooks — reusable recipes that describe what needs to exist and how to verify it. Converge handles the rest.

Here's the simplest possible playbook:

```yaml
# .converge/playbooks/default/playbook.yml
name: default
description: Creates a file and verifies it exists

run:
  mode: autonomous
  maxTaskAttempts: 3

tasks:
  - id: create-file

checks:
  - id: output-exists
    cmd: test -f output.txt
```

```markdown
<!-- .converge/playbooks/default/tasks/create-file/TASK.md -->
---
id: create-file
title: Create output file
checks:
  - id: file-created
    cmd: test -f output.txt
    description: output.txt exists
---

Create a file called `output.txt` in the project root with the content:

    Hello from Converge!
```

That's it. Run `converge run` and the framework creates the file, runs the check, and marks the task complete. If the check fails, it writes a `LEARN.md` analyzing the failure and retries with targeted corrections — not blind retries.

### Self-correction that actually learns

When a task fails verification, Converge doesn't just retry the same thing. It generates a `LEARN.md` file:

```
## What failed
Check `file-created` returned exit code 1.
The file output.txt was not found.

## Why it failed
The agent created the file in the wrong directory (src/ instead of project root).

## What to try next
Create output.txt in the project root directory, not in any subdirectory.
```

The next attempt reads this analysis before executing. Failure context persists across attempts. This turns "retry and hope" into structured learning.

## Real Examples: What You Can Build

### Data Pipeline with Verified Stages

A multi-stage ETL pipeline where each stage has its own verification:

```yaml
# playbook.yml
tasks:
  - id: fetch-data
  - id: transform
    depends_on:
      - fetch-data
  - id: validate
    depends_on:
      - transform

checks:
  - id: pipeline-complete
    cmd: test -f data/validated.json
```

Each task defines its own checks:

```markdown
---
id: validate
title: Validate transformed data
checks:
  - id: validated-exists
    cmd: test -f data/validated.json
    description: Validated data file exists
  - id: all-have-grades
    cmd: "node -e \"const d=JSON.parse(require('fs').readFileSync('data/validated.json'));process.exit(d.records.every(r=>r.grade)?0:1)\""
    description: All records have a grade field
---

Read `data/transformed.json`, verify every record has a valid `grade` field,
and write the result to `data/validated.json`.
```

Checks are deterministic shell commands. Either the file exists or it doesn't. Either all records have grades or they don't. No "looks right to me" AI judgment calls.

### Codebase Standardization

Define what a well-structured project looks like, then let Converge close the gaps:

```yaml
checks:
  - id: readme-exists
    cmd: test -f README.md
  - id: has-title
    cmd: grep -q '^# ' README.md
  - id: license-exists
    cmd: test -f LICENSE
  - id: builds-clean
    cmd: npm run build
  - id: tests-pass
    cmd: npm test
```

Converge scans the checks, finds what's failing, generates tasks to fix them, executes, and verifies. If the build breaks after adding the README, it learns from the failure and fixes the build in the next attempt.

### Repeatable Content Production

Encode your content workflow into a playbook that any team member can run:

```yaml
tasks:
  - id: research
  - id: outline
    depends_on: [research]
  - id: draft
    depends_on: [outline]
  - id: review
    depends_on: [draft]
```

Same playbook, different inputs, consistent quality. New hires produce work that meets the same verification standards as veterans.

## Architecture

Converge is built on three design decisions:

**Filesystem-first.** The `.converge/` directory *is* the execution plan. `ls` shows your task structure. `cat` shows task definitions. No opaque databases, no web UI required for debugging. Kill the process, restart it — state is checkpointed to disk. `ls` is your debugger.

**Hierarchical task decomposition.** Tasks nest to arbitrary depth: Project > Epic > Task > Subtask > ... A single `Unit` class (270 lines) handles all levels uniformly. Parent tasks can declare a WBS (Work Breakdown Structure) function that dynamically generates child tasks at runtime — useful when you don't know all tasks upfront.

**Multi-provider LLM abstraction.** Claude, Gemini, Kimi, and Qwen are supported through the `@converge/agentfn` package. No vendor lock-in. Swap providers without changing your playbook.

## Honest Limitations

Converge is new and early-stage. Some things it doesn't do:

- **No web UI** — CLI-only. LangGraph Studio and OpenHands offer visual debugging.
- **Smaller ecosystem** — fewer integrations than LangGraph or CrewAI.
- **TypeScript-only** — no Python support, which limits reach in a Python-dominated AI framework landscape.
- **Single-machine execution** — no distributed task scheduling.

These are real tradeoffs, not temporary gaps. Converge is designed for a specific paradigm — gap-driven convergence — not as a general-purpose agent framework.

## What's Next

- **Community playbooks** — a library of reusable playbooks for common workflows
- **Cloud dashboard** — web-based monitoring for convergence progress
- **Enterprise playbooks** — pre-built playbooks for compliance, onboarding, and audit workflows

## Try It

```bash
npm install -g @converge/core
```

Create your first playbook:

```bash
mkdir -p .converge/playbooks/hello/tasks/01-setup
```

Define a task with checks:

```markdown
---
title: Project Setup
checks:
  - id: readme-exists
    cmd: test -f README.md
    description: README.md exists
---

Create a README.md for this project.
```

Run it:

```bash
converge run --playbook=hello
```

Watch the convergence loop close every gap until done.

- [GitHub](https://github.com/converge-ai/converge) — Star, fork, contribute
- [Getting Started Guide](../getting-started.md) — Full walkthrough
- [Examples](../../examples/) — Hello World, data pipelines, full-stack apps
- [Comparisons](../comparisons.md) — Honest comparison with LangGraph, CrewAI, AutoGen, Mastra, OpenHands

Define done. Converge gets there.
