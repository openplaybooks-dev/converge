---
title: "Strategy-based self-correction"
description: "When a check fails, a pipeline of named repair strategies tries to unblock the task. Different kinds of failures get different kinds of fixes — not 'try again with the same prompt'."
sidebar:
  order: 4
---
## The retry-and-hope problem

Most agent frameworks treat all failures the same: re-run the task with the same prompt and hope. That works for transient flakes — a network blip, a rate-limit retry, a model that picked badly the first time. It doesn't work for structural problems: a missing dependency, a check that's contractually impossible to satisfy, an agent thrashing on a regex that doesn't match what it's writing.

For structural failures, the same prompt produces the same wrong attempt. The framework spends its retry budget reproducing the failure rather than addressing it.

Converge handles failure differently. When a check fails, the failure is dispatched through a pipeline of named repair strategies. Each strategy claims a specific *class* of failure and applies a targeted fix. Only when no strategy can claim the failure does the framework fall back to "retry with carried-forward context" (which is real value, but not magic — see [Context interpolation](/concepts/context-interpolation/)).

## The strategy pipeline

The coordinator is `UnblockStrategy`. It dispatches to sub-strategies in priority order, stopping at the first one that successfully resolves the failure:

- **`MissingInputPatternRepairStrategy`** — the task's `inputs:` glob doesn't match anything. Fix: rewrite the pattern, or schedule the producer task that creates the input.
- **`DependencyBackoffStrategy`** — the task needs a file that another task is supposed to produce, but that task hasn't run yet. Fix: schedule the producer first, then retry the consumer.
- **`IncompleteProducerOutputStrategy`** — a sibling task produced a partial output. Fix: patch the sibling's output to satisfy the contract.
- **`LoopDetector` + `BuggyCheckRelaxer`** — the agent thrashed on a check it can't satisfy. The loop detector spots the same tool call repeated many times in one attempt; it then asks the agent (via a hint in LEARN.md) whether the check itself might be wrong. If the agent agrees, it writes a `BUGGY_CHECK.md` proposing a corrected predicate. The relaxer validates the proposal (the new predicate must not be a tautology) and patches the materialized TASK.md so the next attempt sees the fix.
- **`SeedScriptRepairStrategy` / `SeedGeneratorRepairStrategy`** — a Seed script crashed or produced invalid task shapes. Fix the script-level failure before retrying.
- **`ToolEnvironmentRepairStrategy`** — a tool the task needs (a CLI, a binary, an env var) is missing or misconfigured. Surface the diagnostic and stop, rather than letting the agent thrash against an unfixable environment.
- **`SkillBasedRepairStrategy`** — the failure matches a known pattern with a documented fix recipe in a skill. Apply the recipe.
- **`UserQuestionResumeStrategy`** — a task explicitly waited for a user answer. Resume when the answer arrives.

Each strategy is a small, independently testable file under `packages/core/src/navigator/repair/strategies/`. Adding a new failure mode to the pipeline is one new file plus a registration; the rest of the framework doesn't change.

## The shape of a strategy

Every strategy implements two methods on the `FixStrategy` interface:

```typescript
interface FixStrategy {
  canHandle(gap: Gap): boolean;       // do I claim this failure?
  tryFix(gap, ctx): Promise<Outcome>; // apply my targeted repair
  preTask?(gap, ctx, prevAttemptDirs): Promise<void>; // optional: inject context into the next attempt
}
```

The contract is simple. `canHandle` is a fast filter — it looks at the failure's `gapKind` and decides whether this strategy is even applicable. `tryFix` is the actual repair: it can edit files, schedule other tasks, write feedback artifacts, or signal that the failure should fall through to the AI.

Outcomes carry a `retryMode`: most successful repairs return `"full"` (retry the whole task), some return `"validate"` (just rerun the checks), some return a `"backoff"` shape with an explicit list of producer tasks that must run first.

## Why this composes with context interpolation

The two systems are complementary, not redundant.

- **Strategies are the structured, programmable repair path.** When the failure mode is *known* — and converge has 11+ strategies for the most common ones — the structured fix runs in milliseconds, requires no AI call, and produces an unambiguous outcome.
- **LEARN.md and context interpolation are the unstructured, AI-driven repair path.** When the failure is novel, no strategy claims it, and the next attempt's agent reads the carried-forward analysis and figures out a fix from context.

A single failed attempt can trigger both: a strategy applies its targeted fix (e.g. rewriting an input glob), AND the failure analysis lands in LEARN.md so that *if the strategy was wrong* the next attempt's agent has the diagnostic to re-evaluate.

## What this guarantees and what it doesn't

- **Bounded.** Strategies don't run forever. The per-task retry budget (`maxTaskAttempts`, default 3) caps the total number of attempts. Within a single attempt, the loop detector caps thrashing within the agent.
- **Targeted.** A failure that matches a strategy's `canHandle` gets that strategy's fix, not a generic retry. This is observable in the run log: you see exactly which strategy claimed the failure.
- **Non-magical.** Strategies fix *known* failure shapes. Novel failures still fall through to the AI. A strategy that *thinks* it fixed a failure but didn't will burn the next attempt's budget; the failure will then surface again with the strategy's name in the diagnostic.
- **Doesn't fix wrong contracts.** If the checks themselves are wrong, no amount of strategy dispatch reaches a passing state — but the buggy-check relaxer is the framework's escape hatch for exactly that case.

## Trade-offs

- **More strategies = more places to misroute a fix.** A strategy that's too eager to claim failures it can't actually fix wastes budget. Each new strategy needs careful `canHandle` filtering.
- **Strategies are framework code, not playbook code.** Adding one requires a code change to `packages/core/src/navigator/repair/strategies/`. This is intentional — strategies need to compose with the framework's repair contract — but it means playbook authors can't ship their own strategies inline.
- **The strategy contract assumes failures are observable enough to classify.** Files missing, regex didn't match, exit code 1 — all classifiable. Opaque failures (a model timeout that returns no useful diagnostic, a rate limit that surfaces as a generic 5xx) bypass the pipeline and fall straight through to retry-with-context.
- **Complexity has a cost.** Eleven strategies is a lot of moving parts. Converge accepts this cost because the alternative — retry-and-hope on every failure — burns much more on long runs.

## Where this lives in the codebase

- `packages/core/src/navigator/repair/strategies/unblock.ts` — the `UnblockStrategy` coordinator.
- The 11 sub-strategies in the same directory: `dependency-backoff.ts`, `missing-input-pattern.ts`, `incomplete-producer-output.ts`, `seed-script-repair.ts`, `seed-generator-repair.ts`, `tool-environment-repair.ts`, `skill-based-repair.ts`, `user-question-resume.ts`, `task-run.ts`, `missing-seed-script.ts`.
- `packages/core/src/navigator/repair/types.ts` — the `FixStrategy` interface, `Resolution`, `RetryMode`, `StrategyOutcome`.
- `packages/core/src/task/lifecycle/loop-detector.ts` — scans the previous attempt's tool-call log for thrashing.
- `packages/core/src/task/lifecycle/buggy-check-relaxer.ts` — reads `BUGGY_CHECK.md`, validates the proposed predicate, patches the materialized TASK.md.
- `packages/core/src/navigator/repair/strategies/AUTO_HEAL_GUIDE.md` and `PATTERN_REPAIR.md` — internal guides for adding new strategies.

If you've watched a converge run and seen a line like `🔧 Attempting auto-repair (attempt 1/3)…` followed by a strategy name, you've seen this pipeline at work.

For the engineering view of how the strategy registry itself is structured — the flat catalog with declarative context steps, deterministic-first ordering, and how new strategies plug in without orchestrator changes — see [Advanced: the strategy catalog](../advanced/04-strategy-catalog).
