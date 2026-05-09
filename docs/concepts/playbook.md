---
title: "The playbook"
description: "The playbook is Converge's unit of work: a specification that defines both what success looks like and how to achieve it, with verifiable checks as the binding contract."
sidebar:
  order: 1
---

## You write the spec. The agent executes it. The checks prove it.

A playbook is a complete specification for work. It defines the target state (inputs, outputs, checks), the method (task body instructions, skills to invoke), and the proof (shell commands that verify the work was done). The agent reads the spec, follows the method, and the checks confirm it worked.

Think of it as a blueprint, not a recipe and not a grocery list. A blueprint says: here's the structure, here are the materials, here's how to assemble it, and here's how to inspect it. The playbook is the blueprint: it specifies what to build, how to build it, and how to verify the build. The agent is the builder.

This is the standard that everything else in Converge builds on. Skills provide reusable execution techniques. Playbooks compose those skills with task definitions, file contracts, and checks into a complete, runnable specification.

<figure class="cv-figure" role="img" aria-labelledby="cv-fig-title cv-fig-desc" style="margin: 1.5rem 0;">
  <svg viewBox="0 0 720 280" xmlns="http://www.w3.org/2000/svg" class="cv-svg" style="width: 100%; max-width: 720px; height: auto; display: block;">
    <title id="cv-fig-title">Playbook as specification: target + method + verification</title>
    <desc id="cv-fig-desc">
      A three-panel diagram. Left: a playbook.yml and TASK.md files (specification). Center: the Converge
      runtime (compile, DAG, execute). Right: produced files and passing checks (verification).
    </desc>

    <!-- Left panel: specification -->
    <rect x="20" y="20" width="200" height="240" rx="10" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <text x="120" y="48" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="#94A3B8" letter-spacing="0.08em">SPECIFICATION</text>

    <rect x="36" y="62" width="168" height="42" rx="6" fill="#0F172A" stroke="#475569" stroke-width="0.8"/>
    <text x="120" y="80" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#E2E8F0">playbook.yml</text>
    <text x="120" y="94" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">name, tasks, checks</text>

    <rect x="36" y="112" width="168" height="56" rx="6" fill="#0F172A" stroke="#475569" stroke-width="0.8"/>
    <text x="120" y="130" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#E2E8F0">TASK.md</text>
    <text x="120" y="144" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">inputs, outputs,</text>
    <text x="120" y="157" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">checks, instructions</text>

    <rect x="36" y="176" width="168" height="42" rx="6" fill="#0F172A" stroke="#475569" stroke-width="0.8"/>
    <text x="120" y="194" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#E2E8F0">PLAN.md</text>
    <text x="120" y="208" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">design blueprint</text>

    <!-- Center panel: runtime -->
    <rect x="260" y="20" width="200" height="240" rx="10" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <text x="360" y="48" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="#94A3B8" letter-spacing="0.08em">RUNTIME</text>

    <rect x="276" y="68" width="168" height="34" rx="6" fill="#0F172A" stroke="#6366F1" stroke-width="0.8"/>
    <text x="360" y="88" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#A5B4FC">compile</text>
    <text x="360" y="110" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">builds DAG</text>

    <rect x="276" y="124" width="168" height="34" rx="6" fill="#0F172A" stroke="#6366F1" stroke-width="0.8"/>
    <text x="360" y="144" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#A5B4FC">run</text>
    <text x="360" y="166" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">executes tasks</text>

    <rect x="276" y="176" width="168" height="34" rx="6" fill="#0F172A" stroke="#6366F1" stroke-width="0.8"/>
    <text x="360" y="196" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#A5B4FC">verify</text>
    <text x="360" y="218" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">runs checks</text>

    <!-- Right panel: verification -->
    <rect x="500" y="20" width="200" height="240" rx="10" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <text x="600" y="48" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="#94A3B8" letter-spacing="0.08em">VERIFICATION</text>

    <rect x="516" y="68" width="168" height="34" rx="6" fill="#0F172A" stroke="#22D3EE" stroke-width="0.8"/>
    <text x="600" y="88" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#67E8F9">produced files</text>
    <text x="600" y="110" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">outputs on disk</text>

    <rect x="516" y="118" width="168" height="34" rx="6" fill="#0F172A" stroke="#22D3EE" stroke-width="0.8"/>
    <text x="600" y="138" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#67E8F9">passing checks</text>
    <text x="600" y="160" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">exit code 0</text>

    <rect x="516" y="168" width="168" height="34" rx="6" fill="#0F172A" stroke="#22D3EE" stroke-width="0.8"/>
    <text x="600" y="188" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#67E8F9">journal</text>
    <text x="600" y="210" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748B">replayable run record</text>

    <!-- Arrows between panels -->
    <path d="M 220 140 L 254 140" fill="none" stroke="#6366F1" stroke-width="1.6" marker-end="url(#pb-arrow)"/>
    <path d="M 460 140 L 494 140" fill="none" stroke="#6366F1" stroke-width="1.6" marker-end="url(#pb-arrow)"/>

    <defs>
      <marker id="pb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366F1"/>
      </marker>
    </defs>

    <text x="360" y="272" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#64748B" letter-spacing="0.06em">
      Specification → Runtime → Verification: the playbook drives this loop
    </text>
  </svg>
  <figcaption class="cv-caption" style="font-size: 0.875rem; color: var(--sl-color-gray-3, #94A3B8); margin-top: 0.75rem; line-height: 1.5;">
    A playbook moves through three stages: <strong>specification</strong> (you define target, method, and checks),
    <strong>runtime</strong> (Converge compiles and executes), and <strong>verification</strong>
    (checks prove the work was done).
  </figcaption>
</figure>

## What makes a playbook a standard

A playbook isn't a script and it isn't a vague goal. It's a precise specification. Five properties make it a standard you can reference, share, and replay:

**1. Complete.** A playbook specifies all three layers: the target (inputs, outputs), the method (task body instructions, skills), and the proof (checks). Nothing is left to guesswork. The agent knows what to produce, how to approach it, and how to verify it's right.

**2. File-based.** Every task declares its `inputs:` (what it needs to read) and `outputs:` (what it must produce). Files are the handshake between tasks: no shared memory, no vector store, no message queue. If task B lists a file that task A produces, the runtime wires them together automatically.

**3. Check-driven.** "Done" is defined by shell commands that exit 0 or non-zero. Not by AI judgement. Not by "looks good to me." A task is done when its checks pass. See [Deterministic checks](./deterministic-checks) for why this matters.

**4. Composable.** A task can contain sub-tasks. A container task diverges into children, they execute independently, then the parent converges their results. This pattern is recursive: children can themselves contain sub-tasks. See [Convergence](./convergence) for the full pattern.

**5. Reproducible.** Every run produces a journal: a directory of manifests, runstate, and event streams. The journal is a replayable record. Given the same playbook and the same starting state, Converge can reproduce the same result.

## Anatomy of a playbook

A playbook lives in `.converge/playbooks/<name>/`. Three files define it:

```
.converge/playbooks/implement-feature/
├── playbook.yml          ← entry point: name, run config, task graph
├── PLAN.md               ← design blueprint (why these phases, what each produces)
└── tasks/                ← the work, decomposed
    ├── 01-research/
    │   └── TASK.md       ← spec: inputs, outputs, checks, instructions
    ├── 02-implement/
    │   ├── TASK.md
    │   └── tasks/        ← nested sub-tasks (recursive)
    │       └── 01-core-logic/
    │           └── TASK.md
    └── 03-verify/
        └── TASK.md
```

### playbook.yml: the entry point

The minimal playbook is a name, a list of tasks, a run mode, and global checks.

```yaml
name: implement-feature
description: Build the feature described in spec.md
run:
  mode: oneoff
  maxTaskAttempts: 3
tasks:
  - path: 01-research
  - path: 02-implement
  - path: 03-verify
checks:
  - id: feature-tests-pass
    cmd: pnpm test -- --filter=./src/feature
```

Every field: [playbook.yml reference](../reference/playbook-yml)

### TASK.md: the per-task specification

Each task declares what it reads, what it produces, how to approach the work, and how to verify it's done.

```yaml
---
id: 02-implement
title: Implement the feature
inputs:
  - spec.md
  - 01-research/notes.md
outputs:
  - src/feature/index.ts
  - src/feature/index.test.ts
checks:
  - id: tests-pass
    cmd: pnpm test -- --filter=./src/feature
  - id: types-check
    cmd: pnpm tsc --noEmit
---

Read spec.md and the research notes. Implement the feature following
the patterns in CONTRIBUTING.md. Write tests that cover the happy path
and the edge cases listed in spec.md.
```

The frontmatter declares the target (inputs, outputs, checks). The body provides the method (what approach to take, what patterns to follow, what edge cases to handle). Before the task runs, the runtime snapshots every declared input. After it runs, the runtime verifies every check. Only then does the task's outputs become available to downstream tasks.

Every field: [TASK.md reference](../reference/task-md)

### PLAN.md: the design blueprint

Container tasks (tasks that decompose into children) include a PLAN.md that records design decisions: why these phases, what each child produces, which delegation pattern was chosen. It's the architectural reasoning separate from the contracts: useful when revisiting a playbook weeks later or when someone else needs to understand why the task tree looks the way it does.

## Playbooks and skills: two complementary standards

Converge has two first-class standards: playbooks and skills. They work together.

| | Playbook | Skill |
|---|---|---|
| **What it provides** | The full specification: target, method, and verification | Reusable execution techniques |
| **Author** | You (the problem-solver) | Framework author or domain expert |
| **Format** | `playbook.yml` + `TASK.md` | `SKILL.md` + reference files |
| **Lives in** | `.converge/playbooks/<name>/` | `skills/<name>/` or `.claude/skills/<name>/` |
| **Invoked by** | `converge run` | `/skill-name` in Claude Code |
| **Reuse** | Copy and adapt | Install once, invoke anywhere |
| **Lifecycle** | Plan → compile → run → verify | Load → match trigger → execute instructions |

A playbook that says "build a REST API" defines the endpoints, the tests, the documentation requirements, and the patterns to follow. It may invoke a skill that provides reusable TypeScript/Express conventions. The playbook specifies the work; the skill supplies domain technique. They compose: **the playbook provides the complete specification; skills plug in reusable execution knowledge.**

You can use playbooks without custom skills (the task body instructions are enough for the agent). You can use skills without playbooks (invoke them directly in Claude Code). But together they form a complete system: **playbooks specify the work; skills supply proven techniques for executing it.**

## The playbook lifecycle

Every playbook moves through four stages:

```
PLAN          →     COMPILE        →      RUN         →     VERIFY
────              ────────             ─────             ────────
You write the     Converge builds      Agent executes     Checks prove
specification     the DAG              each task          it's done
```

1. **Plan.** You write the playbook (or use the [`converge-planning`](/guides/converge-planning-skill) skill to generate it from a description). The output is a `.converge/playbooks/<name>/` directory with `playbook.yml`, `PLAN.md`, and `TASK.md` files.

2. **Compile.** `converge compile` reads the playbook and builds a DAG: computing which tasks depend on which, splitting container tasks into diverge+converge nodes, and producing a `manifest.json` that the runtime uses.

3. **Run.** `converge run` walks the DAG in topological order. Each task whose dependencies are satisfied executes: the agent reads the TASK.md (both the frontmatter contract and the body instructions), produces the declared outputs, and the checks run. Passed tasks feed their outputs to downstream tasks. Failed tasks retry (up to `maxTaskAttempts`).

4. **Verify.** After all tasks complete, playbook-level checks run. The journal at `.converge/journal/<name>/` contains the full run record: manifests, runstate, event stream, and per-task outputs.

## Why this matters: the alternative is drift

Without a playbook, an agent session is a conversation. The agent does work, produces output, and you inspect it. If something's wrong, you say "fix X." If you run it again tomorrow, you get a different result: the agent's context is different, the model is different, the intermediate steps are different.

A playbook pins the specification. Run it today, run it next week, run it on a different model: the inputs, outputs, method, and checks are the same. The agent follows the same instructions. The same checks verify the result. The specification holds even as the model adapts within the bounds you set.

This is what makes a playbook a standard rather than a script. A script says "run these exact commands" (brittle). A vague goal says "make something good" (unverifiable). A playbook says "here's the target, here's the approach, here's how you prove it worked."

## Trade-offs

- **Upfront cost.** Writing a good playbook means thinking through tasks, inputs, outputs, method, and checks before work begins. For a one-off task that takes 30 seconds, this is overkill. For a problem that takes hours or spans multiple sessions, the upfront cost pays back in coherence and reproducibility.
- **Checks must be right.** A check that's too loose lets bad work pass. A check that's too tight causes false failures and retry loops. Writing good checks is a skill: see [Deterministic checks](./deterministic-checks) for guidance.
- **File-shaped interfaces don't fit everything.** "Why did the agent choose approach A over B?" is hard to capture as a file output. Facts and ancestor summaries fill some of this gap, but they're coarser than the file contract.
- **Not a replacement for human review.** A playbook verifies that checks pass, not that the work is good. The checks are your proxy for quality: if they miss something, the playbook misses it too.

## Where this lives in the codebase

| Component | File |
|---|---|
| Playbook type + loader | `packages/core/src/playbook.ts` |
| playbook.yml parser | `packages/core/src/config/loader.ts` |
| TASK.md loader | `packages/core/src/task/task-md.ts` |
| DAG construction from playbook | `packages/core/src/dag/task-dag.ts` |
| Planner playbook (generates playbooks) | `packages/core/src/playbooks/planner/index.ts` |
| Schema reference | `skills/converge-planning/references/schema.md` |
| Playbook reference | `docs/reference/playbook-yml.md` |
| TASK.md reference | `docs/reference/task-md.md` |

If you want to see a playbook in action, start with the simplest one: `examples/hello-world/.converge/playbooks/default/playbook.yml`: 14 lines, one task, two checks. Or read [Your first playbook](../getting-started/your-first-playbook) for the step-by-step walkthrough.
