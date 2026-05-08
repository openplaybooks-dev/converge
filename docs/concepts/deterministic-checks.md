---
title: "Deterministic checks"
description: "Verification is shell commands, not AI judgement. The contract for 'done' is code that runs and returns 0 or 1."
sidebar:
  order: 3
---
## The judgement problem

Most agent frameworks ask the AI itself "are you done?" The AI says yes. Sometimes the work is right. Sometimes the AI is wrong about whether the work is right. You don't find out which until you look — by hand.

This is a fundamental mismatch. The thing producing the work is the same thing certifying it. There's no independent observer in the loop.

Converge inverts this. The AI proposes work; a deterministic shell predicate decides whether the work satisfies the contract. The AI never gets to declare itself done.

## What checks look like

A check is a one-line shell command in TASK.md frontmatter under `checks:`. It returns exit 0 (pass) or non-zero (fail).

```yaml
checks:
  - id: page-exists
    cmd: "test -f docs/reference/cli/index.md"
    description: page exists
  - id: lists-commands
    cmd: "test $(grep -cE '^[-*]\\s*`?converge\\s+\\w+' docs/reference/cli/index.md) -ge 8"
    description: lists at least 8 commands
  - id: tests-pass
    cmd: "npm test -- --run src/routes/health.test.ts"
    description: health-check tests pass
```

Three patterns appear constantly: `test -f` for file existence, `grep -qE` for content patterns, and the project's own test runner for behavioral guarantees. The vocabulary is the same shell vocabulary you'd use to verify the work yourself.

## Why this changes the agent's job

The agent doesn't need to *believe* it's done. It needs to *make the predicate pass*. Those are different jobs.

- **The predicate is the contract.** It's auditable, reviewable, version-controlled. Anyone reading the playbook can run a check by hand and see what it returns. There's no hidden judgement.
- **The agent has latitude in *how* it satisfies the predicate.** Two attempts can produce structurally different artifacts and both pass. Convergence is on the property the check measures, not on a specific implementation.
- **Failure is observable.** A failed check has stdout and stderr. The next attempt sees them. (See [Context interpolation](/concepts/context-interpolation/).)

The composition with context interpolation matters: the check's output isn't just a pass/fail signal — it's the most accurate, most current diagnostic available about what's wrong. When the check fails, its output flows into LEARN.md and into the next attempt's prompt.

## How this changes how you think about a task

Writing a converge task is mostly writing the checks. The instruction prose helps the agent navigate, but the checks define what done means. A reviewer looking at a TASK.md should be able to skip the prose, read only the checks, and understand the contract.

Two questions for every check:

1. **Does it fail when the work isn't done?** A check that passes against an empty directory can never measure progress. It's a tautology.
2. **Does it pass when the work is done?** A check too strict to ever satisfy is the other failure mode. Often a regex that matches one bullet style but not the other.

Both failure modes show up constantly in practice. Both will keep the agent thrashing on a task it can never complete.

## Pre-flight check linting

Because bad checks are the #1 source of stuck runs, the framework now lints every check at startup. Each check's command is run twice in a sandbox: once against an empty directory (it should fail) and once against placeholder outputs (it should also typically fail or pass appropriately). If a check passes both, it's a tautology and the run is blocked with a clear error.

This catches the most common contract bugs (missing `test -f` guards on `wc -w` pipelines, regex patterns that can't match the bullet style the agent will produce, file-existence checks that don't reference any declared output) before any tokens are spent.

## Trade-offs

- **Checks must be authored carefully.** The framework can lint for tautologies, but it can't tell you whether the predicate captures what *you* mean by "done." A check that passes on garbled output but rejects valid output is the worst case — the agent satisfies it but produces nothing useful.
- **Some properties are hard to express in shell.** "Is this prose well-written" doesn't fit neatly into `grep`. For those, you either decompose into measurable sub-properties (word count, required sections, link validity) or accept that some quality dimensions stay out of the contract.
- **Checks are shell commands, so they inherit shell's pitfalls.** Quoting, escaping, exit-code semantics across pipelines (`pipefail` is off by default in `/bin/bash -c`). The check linter helps; careful authoring helps more.
- **Deterministic doesn't mean fast.** A check that runs the full test suite costs minutes per attempt. Lighter-weight checks that approximate the property can be appropriate during iteration, with the heavy check as a final gate.

## Where this lives in the codebase

- `packages/core/src/task/lifecycle/after.ts` — `runCheck()` executes each check command via `child_process.exec` with a 30-second timeout, captures stdout/stderr, returns a `CheckRunResult`.
- `packages/core/src/task/playbook/check-linter.ts` — pre-flight lint that runs every check against empty + positive-control sandboxes at startup.
- `packages/core/src/task/lifecycle/learn.ts` — feeds failed-check output into LEARN.md so the next attempt sees what the predicate said.

If you want to understand how a task converges, watch its checks. The agent's job is to make them pass; the framework's job is to give the agent enough context to figure out how.
