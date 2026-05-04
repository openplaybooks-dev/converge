---
name: converge-development
description: Use when the user wants to develop, debug, or improve the converge framework itself — running an example as a test bed, observing framework behavior, diagnosing framework bugs, and editing source under packages/. Triggers on phrases like "debug converge", "fix the framework", "why does the runner do X", "improve the journal", "add a feature to the CLI", "use this example to find bugs in converge".
---

# Converge Development — observe-diagnose-fix the framework itself

## Purpose

Use a real example playbook as a test bed. Run it. Watch what the framework does internally — not just the stdout event stream, but the journal files, checkpoints, and per-attempt logs the runner writes to disk. When the framework misbehaves (crashes, corrupts state, loops on something it shouldn't, fails to retry, mishandles a provider response), trace the symptom to the package and module responsible, patch `packages/**` source, rebuild, and re-run the example to verify.

This skill is **only** for changes to framework source under `packages/`. It is the framework-developer counterpart to `converge-control` (which babysits a *user's* playbook and treats the framework as a black box).

## When to invoke

Trigger on user requests like:

- "Debug converge using <example>" / "Use this example to find bugs in the framework"
- "Why does the navigator <do X>?" / "Why is the runner <doing Y>?"
- "Fix the framework — <symptom>" / "There's a bug in the journal/checkpoint/seed/CLI"
- "Improve <subsystem>" / "Add a feature to the CLI" / "Refactor a navigator action"
- "Profile / instrument / add logging to <module>"

Do **not** invoke for:

- Running a *user's* playbook to completion → **`converge-control`**
- Fixing a stuck user playbook (stale outputs, stall, foreign-playbook hijack) → **`converge-control`**
- Designing a new playbook or setting up `.converge/` from scratch → **`converge-planning`**

If the symptom is purely user-shape (the playbook author made a mistake), route to `converge-control`. If the symptom is framework-shape (the runner mishandles a *valid* user playbook), continue here.

## The dev loop

Eight steps, in order. Stay in this loop until the example passes cleanly or you hit a structural decision that needs the user.

### 1. Pick a test bed

If the user named an example in the trigger phrase, use it. Otherwise ask which example to use. The smallest example that exercises the suspected subsystem is usually best — see the subsystem→example table in `reference/framework-map.md`.

Default examples by subsystem:

- Navigator / convergence loop / gap detection → `examples/test-simple-run` (smallest), `examples/hello-world` (fast loop)
- Seed / dynamic spawn → `examples/test-seeding`, `examples/test-seed-repair`, `examples/autonomous-pentest` (heavy seed use)
- agentfn / provider → whichever example uses that provider (check its `.converge/project.yaml`)
- Journal / checkpoint / status → `examples/test-resume`, `examples/test-multi-attempt`
- CLI surface → any example, but run the specific command being debugged
- Gap / check behavior → `examples/test-buggy-check`, `examples/test-gap-blocked-input`, `examples/test-gap-missing-output`
- Loop / stall detection → `examples/test-loop-detection`

### 2. Build current state

```bash
cd /Users/minh/Documents/converge
pnpm build
```

Confirm it exits clean. **If the build is already broken, that *is* the first bug** — skip to step 5 with the build error as the symptom.

### 3. Run the example & monitor

From the example directory, in the background:

```bash
cd /Users/minh/Documents/converge/examples/<name>
node /Users/minh/Documents/converge/packages/cli/dist/index.js run
```

The runner auto-resumes by default — no `--resume` flag needed to continue a prior run. Common flags for debugging:

| Flag | Use |
|---|---|
| `--force` | Force-run a task even if blocked/completed |
| `--filter <expr>` | Run only a specific task (e.g. `--filter "02-something"`) |
| `--maxDuration <ms>` | Cap run time (e.g. `--maxDuration 600000` for 10 min) |
| `--fullRefresh` | Rebuild from scratch |
| `--restart` | Reset all tasks to pending, then start fresh |
| `--dry` | Show what would execute without running |
| `--step` | Single-step mode |

Arm a Monitor on the stdout file with a focused filter:

```bash
tail -f <output-file> | grep -E --line-buffered "(FAIL|Error|Exception|Overloaded|stalled|did not converge|Validation failed|seeding failed|Task.*completed|Starting:|Iteration|Progress:|All gaps resolved|gap)"
```

Then — and this is what makes this skill different from `converge-control` — also tail the journal for *internal* state:

```bash
# Per-task checkpoint transitions
find .converge/journal -name "checkpoint.json" -exec tail -f {} +

# Per-task event stream (more detail than stdout)
find .converge/journal -name "events.jsonl" -exec tail -f {} +

# Per-attempt detailed events (use after locating the task of interest)
find .converge/journal -path "*/attempts/*/logs/events.jsonl" -exec tail -f {} +
```

Full observability surface: **`reference/observability.md`**.

### 4. Classify the symptom

| Symptom shape | Class | Action |
|---|---|---|
| Example completes cleanly, no anomalies | none | nothing to fix; ask the user what they wanted to investigate |
| Stale paths, stall, missing inputs from user playbook | user-shape | wrong skill; route to **`converge-control`** |
| Navigator action crashes / unhandled exception in preflight, response, or post-action phase | framework | continue to step 5 |
| Checkpoint corruption (status flip-flops, parent stays "seeded" with all children done) | framework | continue to step 5 |
| Seed spawn fails despite valid `seeds/index.js` | framework | continue to step 5 |
| agentfn provider throws on a valid response | framework | continue to step 5 |
| Navigator iterates without progress (gap unchanged across iterations) | framework | continue to step 5 |
| Gap persists despite repair (plan gap after re-plan, seed-script gap on valid script, blocker gap with resolved upstream) | framework | continue to step 5 |
| Resume/restart loses or duplicates work | framework | continue to step 5 |
| CLI arg parsing / exit code wrong | framework | continue to step 5 |

### 5. Diagnose

Open **`reference/framework-map.md`**. Find the subsystem that owns the symptom. Read the source files listed there. Form a hypothesis.

Then check **`troubleshooting/playbook.md`** for a matching past entry. If found → apply the recipe.

If the diagnosis is straightforward and confined to one file, proceed. If it crosses package boundaries (e.g. `core/navigator` ↔ an agentfn provider, or `core/journal` ↔ `cli/commands-clean`), **STOP and surface the hypothesis to the user before editing**. Same escalation pattern as `converge-control`.

### 6. Edit + rebuild

Patch `packages/**`. Then rebuild — the CLI runs from `dist/`, not source:

```bash
# whole monorepo (safe default)
pnpm build

# or single package (faster when the change is scoped)
pnpm --filter @converge/<package-name> build
```

### 7. Verify

Clear the journal state from the failing run (so you're testing the fix, not a half-converged journal):

```bash
cd /Users/minh/Documents/converge/examples/<name>
# Remove all journal task state for a clean re-run
rm -rf .converge/journal/<playbook>/tasks/*
```

Or use the CLI for targeted cleanup:

```bash
node /Users/minh/Documents/converge/packages/cli/dist/index.js clean --select '<expr>'
```

Re-run from step 3. Confirm:

- Original symptom is gone.
- No new symptoms appeared.
- Example reaches exit 0 clean.

If the symptom returns or a new one shows up → loop back to step 5.

### 8. Record the recipe

Append a new entry to **`troubleshooting/playbook.md`** in the format established there: **Symptom** / **Root cause** / **Fix** / **Verification** / **Files touched**. Skip if the fix was a one-off typo. The point is to grow institutional memory so the *next* invocation of this skill recognizes the symptom faster.

## Hard rules — STOP and re-route

- **Don't edit framework source without first reproducing the bug against an example.** No speculative fixes. The reproducible run is also the verification baseline for step 7.
- **Don't skip `pnpm build` between source edit and re-run.** The CLI binary runs from `packages/cli/dist/index.js`, not source. Edits to `packages/**/src/*.ts` have zero effect until rebuilt.
- **Don't `--fullRefresh` the example mid-debug.** That nukes finished work and can mask the bug. Use `rm -rf .converge/journal/<playbook>/tasks/*` to clear journal state. Resume is automatic after a clean kill.
- **Don't bundle unrelated improvements.** One bug, one patch (CLAUDE.md §3 — surgical changes). If you notice adjacent dead code or a refactor opportunity, mention it to the user; don't ship it in the diagnostic fix.
- **Don't run `pnpm test` as a gate for every edit.** Too slow for the dev loop. But if your fix touches a hot path — `core/navigator/core/navigator.ts`, `core/src/navigator/core/actions/`, `core/src/journal/`, `core/src/task/gap/` — flag that to the user and suggest *they* run `pnpm test` before commit.
- **Don't leave `console.log` debugging in the source.** If you added logging to diagnose, remove it before declaring the fix done. (Or convert it to whatever real logging the module already uses.)
- **Apply known recipes; ask before novel ones.** If `troubleshooting/playbook.md` has a matching entry → apply and continue. If it doesn't, and the diagnosis crosses package boundaries → STOP, state hypothesis, wait for approval.
- **Use current terminology.** Don't reference old subsystem names: "WBS" is now "seed", "provider adapter" is now "agentfn provider", the convergence loop is the "navigator". Using old names causes confusion when cross-referencing source.

## Hand-off

| Situation | Hand off to |
|---|---|
| User wants to *run* a playbook (not develop the framework) | **`converge-control`** |
| User wants to design a new playbook | **`converge-planning`** |
| Bug is in the user's example/playbook (TASK.md typo, missing input, wrong path) | **the user** — surface it, don't patch the framework around bad user data |
| Fix touches a hot path and needs full test coverage before merge | **the user** — flag the path, suggest `pnpm test` |

## File map

```
SKILL.md                         (this file — entry point and dev loop)
reference/
  framework-map.md               (subsystem → packages/ location → symptoms → reproducer)
  observability.md               (what to read on disk during a run)
troubleshooting/
  playbook.md                    (symptom → root cause → fix recipes; grows over time)
```

Load **one** file per gap. Return here between.
