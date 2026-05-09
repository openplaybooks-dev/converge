---
title: "From your problem to a playbook"
description: "The mental model for designing a Converge playbook from a real-world objective: how to think about it, in five steps."
sidebar:
  order: 4
---
You have a real problem you want solved repeatedly: research a topic, generate a weekly report, build a thing, simulate a scenario, harden a website. This page is about the **mental model** for turning that into a Converge playbook. Examples come at the end as reference; if the model is right, you won't need them.

## The core idea

Most workflow tools ask you to **describe only the steps**: wire up nodes, choose tools per step, hand off state between them. Converge asks for the full specification: **what success looks like (checks), what files are involved (inputs/outputs), and how to approach the work (task body).** The checks prove it was done correctly.

This means a Converge playbook is mostly answers to one question, asked at different scopes:

> **What must be true for this to be done?**

Ask it about the whole project. Ask it about each phase. Ask it about each task. Each answer is a *check*: a shell command that exits 0 when the condition holds. The set of checks IS the plan.

Once you internalize that, building a playbook is five steps.

## Step 1: Name the artifact

Before anything else, name what should *exist* on disk when this is done. A file, a folder, a tree of files. Be concrete. Don't write "a report": write `out/weekly-report.pdf`. Don't write "a Flutter app": write `lib/main.dart` plus `pubspec.yaml` plus a built `app.apk`.

Why this matters: agents thrash when "done" is vague. A named path is a target a machine can point at. If you can't name the artifact, you don't know what you want yet: go back and figure that out before continuing.

**Bad:** "I want a research report."
**Good:** "I want `out/research/2026-Q2-competitive-landscape.md`, structured with one heading per competitor, each section ≥ 500 words."

## Step 2: Write the verifier *first*

This is the move most people skip and then suffer for. **Write the check before you write the work.**

A check is a shell command that exits 0 if your artifact is good and non-zero if it's not. For each thing you said about the artifact in Step 1, write one check:

| You said | Write this check |
|---|---|
| "the file exists" | `test -f out/research/2026-Q2-competitive-landscape.md` |
| "structured with one heading per competitor" | `test $(grep -c '^## ' out/research/...md) -ge 5` |
| "each section ≥ 500 words" | a small node script that walks the file and asserts |

Two reasons this matters:

1. **It forces you to define done in machine-checkable terms.** Vague intent dies here. Either you can write the check, or your target isn't crisp enough yet.
2. **The agent uses checks as the loop condition.** When checks fail, it iterates. When checks pass, it stops. No checks means the agent doesn't know when to stop, and the run never converges.

If a check feels too hard to write: for example, "the writing must be persuasive": that's a signal the target needs reshaping into something objectively verifiable. "Persuasive" → "contains a comparison table, a quoted source, and a concrete recommendation." Now those are checks you can write.

## Step 3: Decompose into phases that build on each other

A playbook with one giant task fails. The agent can't hold the whole thing in one attempt and there's no checkpoint to resume from. So break the work into **phases that each produce a verifiable artifact**: each phase's output becomes the next phase's input.

The pattern that works almost everywhere:

```
prepare  →  design  →  build  →  verify  →  ship
```

- **Prepare**: gather inputs, write a spec, define what success means in writing
- **Design**: make the structural decisions (architecture, schema, layout, sections)
- **Build**: produce the actual artifact
- **Verify**: run all the checks; this phase exists to *gate* anything irreversible
- **Ship**: deploy, publish, notify, or whatever final step makes it real

Not every project needs all five: a small task might be just `prepare → build → verify`. But the rhythm is the same: each phase has its own outputs and checks, and the next phase can't start until the previous one's checks pass. **That's how you get to a runnable plan instead of a hopeful one.**

This is the **diverge → converge** pattern. Each phase diverges into sub-tasks; their outputs converge as inputs to the next phase. If a phase has parallel work (multiple builds, multiple reports), it fans out into children that run independently, then converges through a combine step. The same rhythm repeats at every scope: project, phase, task.

## Step 4: Write the playbook by answering the question at each scope

Now you have an artifact, a verifier, and a phase breakdown. Translate them into the file structure Converge runs:

```
.converge/playbooks/<your-playbook>/
├── playbook.yml          ← project-scope checks (what's true at the very end?)
└── tasks/
    ├── 01-prepare/
    │   └── TASK.md       ← phase-scope checks (what's true after prepare?)
    ├── 02-design/
    │   └── TASK.md
    └── 03-build/
        └── TASK.md
```

Each `TASK.md` declares three things:

```yaml
---
id: 01-prepare
outputs:                  # what files this task produces
  - .content/spec.md
checks:                   # how we know it's done (shell, exit 0 = pass)
  - id: spec-exists
    cmd: test -f .content/spec.md
  - id: spec-has-sections
    cmd: grep -q '^## Objectives' .content/spec.md
---

Write a spec.md describing the objective, target audience,
constraints, and success criteria. ≥ 200 words.
```

That's it. The frontmatter is the contract; the body is the prompt the agent reads. Repeat for each phase. The agent's job is to satisfy the checks; your job is to write checks that, taken together, mean "done."

## Step 5: Run, watch the journal, tighten the checks

First run will rarely be perfect. Either the agent does the wrong thing (your checks were too loose: it satisfied them in a way you didn't want) or the agent thrashes (your checks were too tight or referred to paths that don't exist). Both are diagnosable from the journal at `.converge/journal/`.

The discipline is: **never debug by changing the prompt. Debug by changing the checks.** If the agent did the wrong thing, your checks were wrong. Tighten them so the wrong outcome would fail. Re-run. Repeat until the playbook does what you mean.

This is why writing checks first (Step 2) pays off: by the time you run, you've already done the hard thinking. The run is just verification of the model.

## A quick gut-check

If you can answer these three questions about your playbook, you have a working mental model:

1. **What file or folder is the proof this ran successfully?** (Step 1)
2. **What shell command, if it exits 0, means I trust the proof?** (Step 2)
3. **What's the smallest set of phases such that each one produces a checkpoint I'd be willing to resume from?** (Step 3)

Anything you can't answer is the next thing to figure out, before you start running.

## Examples (optional)

If you've worked through the model and want a concrete reference, the [Examples gallery](/docs/examples/) shows real playbooks built this way. Suggested first reads, picked because they cleanly demonstrate the prepare → design → build → verify → ship rhythm:

- [`baby-app`](/docs/examples/software/baby-app): Flutter app: prepare requirements → design system → build screens → wire behavior → polish
- [`deep-research`](/docs/examples/research/deep-research): research report: scoping → multi-round investigation → synthesis → output
- [`landing-page`](/docs/examples/software/landing-page): marketing site: spec → bootstrap → design system → sections → docs → blog → polish → verify → ship

Skim the `playbook.yml` and one or two `TASK.md` files in each. Notice how every task answers the same question: *what must be true for this to be done?*: at its own scope. That's the whole pattern.

## When you get stuck

- **The agent did the wrong thing** → your checks let it. Tighten them. Don't rewrite the prompt.
- **The agent can't satisfy a check** → either the check refers to something the agent can't produce (path drift, missing tool), or your phase is too big. Shrink the phase.
- **The run errors out** → [Troubleshooting](/troubleshooting/)
- **You want the framework to handle the run for you** → use the [`converge-control`](/guides/converge-control-skill) skill in Claude Code; it babysits the run and self-corrects through common failure modes
- **You want Claude to write the playbook from a one-line prompt** → use the [`converge-planning`](/guides/converge-planning-skill) skill

## You don't need to write code

Everything above is editing markdown and YAML. The Converge agent writes the actual work. If you find yourself opening TypeScript files, you've moved past the non-technical track: see [Build a software project](/guides/build-a-software-project) for that path.
