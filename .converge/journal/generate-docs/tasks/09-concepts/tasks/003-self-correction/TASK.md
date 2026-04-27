---
id: 003-self-correction
title: Write docs/concepts/self-correction.md
inputs:
  - packages/core/src/journal/types.ts
  - packages/core/src/index.ts
outputs:
  - docs/concepts/self-correction.md
checks:
  - id: page-exists
    cmd: "test -f docs/concepts/self-correction.md"
    description: page exists
  - id: covers-learn-md
    cmd: "grep -q 'LEARN\\.md' docs/concepts/self-correction.md"
    description: covers LEARN.md
  - id: contrasts-retry-and-hope
    cmd: "grep -qiE 'retry|context|feedback' docs/concepts/self-correction.md"
    description: explains how this differs from retry-and-hope
---

# Write `docs/concepts/self-correction.md`

The third pillar: how converge handles failure. The mental model that makes
LEARN.md make sense.

## Required frontmatter

```yaml
---
title: "Self-correction"
description: "Failure as context, not retry-and-hope. How LEARN.md carries information forward."
sources:
  - packages/core/src/journal/types.ts
  - packages/core/src/index.ts
sidebar:
  order: 3
---
```

## Required structure

1. **The failure problem.** When a check fails, the agent has two options:
   give up, or try again. Most frameworks pick "try again with the same
   prompt" — retry-and-hope. The next attempt has no idea why the previous
   one failed, so often it makes the same mistake.

2. **The fix: structured failure context.** When a check fails in converge,
   the agent writes a `LEARN.md` block: what was attempted, what the check
   said, what the agent thinks went wrong. The next attempt reads this
   *before* generating a new approach.

3. **Anatomy of a LEARN.md block.** Show the rough format. Pull from a real
   one in `.converge/journal/.../LEARN.md` if available; otherwise reverse-
   engineer from `packages/core/src/journal/`.

4. **What this buys you.**
   - Convergence on hard problems where the first attempt is unlikely to
     succeed.
   - Visible debugging trail — the LEARN.md is a human-readable forensic
     record.
   - Cost-bounded retries — `run.maxTaskAttempts` caps the loop; you don't
     pay for infinite hope.

5. **What it doesn't fix.**
   - Wrong target state — if the checks are wrong, no amount of LEARN.md
     analysis converges. The reader is on the hook for writing right checks.
   - Non-deterministic failures — flaky checks (network, time-of-day, etc.)
     thrash the loop.
   - Provider-side issues — if the model itself can't solve the problem
     class, more context doesn't help.

6. **The convergence loop, revisited.**
   ```
   measure → plan → act → measure → ┬─ all checks pass: done.
                                    └─ check failed: write LEARN.md → loop.
   ```
   `run.maxTaskAttempts` (default 3) caps the loop count.

## Read first

- `packages/core/src/journal/types.ts` for `LEARN.md` event shape (if
  represented as a journal event type).
- A real LEARN.md from `.converge/journal/.../` if any task has failed.

## Banned

- Selling self-correction as magic. It's bounded, observable, and has clear
  limits. Name them.
- Inventing the LEARN.md format. Cite a real example or the source.
