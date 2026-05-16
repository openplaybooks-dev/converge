---
name: converge-development
description: Use when the user wants to develop, debug, or improve the converge framework itself — running an example as a test bed, running the self-improvement loop, observing framework behavior, diagnosing framework bugs, and editing source under packages/. Triggers on phrases like "debug converge", "fix the framework", "run the self-improvement loop", "autonomous framework improvement", "why does the runner do X", "improve the journal", "add a feature to the CLI", "use this example to find bugs in converge".
---

# Converge Development — observe-diagnose-fix the framework itself

## Purpose

Use a real example playbook as a test bed. Run it. Watch what the framework does internally — not just the stdout event stream, but the target directory, runstate, and per-attempt forensics the runner writes to disk. When the framework misbehaves (crashes, corrupts state, fails to retry, mishandles a provider response), trace the symptom to the package and module responsible, patch `packages/**` source, rebuild, and re-run the example to verify.

This skill is **only** for changes to framework source under `packages/` or for running framework-improvement playbooks that target `packages/`. It is the framework-developer counterpart to `converge-control` (which babysits a *user's* playbook and treats the framework as a black box).

## Two modes

- **Interactive:** reproduce a named framework bug, patch `packages/**`, rebuild, verify.
- **Autonomous:** run `self-improvement-loop` for bounded framework hardening, then use its artifacts as the evidence trail.

## When to invoke

Trigger on user requests like:

- "Debug converge using <example>" / "Use this example to find bugs in the framework"
- "Why does the DAG runner <do X>?" / "Why is the execution <doing Y>?"
- "Fix the framework — <symptom>" / "There's a bug in the manifest/target/seed/CLI"
- "Improve <subsystem>" / "Add a feature to the CLI" / "Refactor a DAG action"
- "Run the self-improvement loop" / "Autonomously improve the framework"
- "Profile / instrument / add logging to <module>"

Do **not** invoke for:

- Running a *user's* playbook to completion → **`converge-control`**
- Fixing a stuck user playbook (stale outputs, stall, foreign-playbook hijack) → **`converge-control`**
- Designing a new playbook or setting up `.converge/` from scratch → **`converge-planning`**

If the symptom is purely user-shape (the playbook author made a mistake), route to `converge-control`. If the symptom is framework-shape (the runner mishandles a *valid* user playbook), continue here.

## Autonomous mode: self-improvement-loop

Run bounded framework hardening with:

```bash
converge run --playbook=self-improvement-loop --select improve+
```

Use only these surfaces unless debugging the playbook itself:

- source: `.converge/playbooks/self-improvement-loop/README.md`, `tasks/improve/TASK.md`, spawned-task flow artifacts, `scripts/*.mjs`;
- evidence: `.converge/artifacts/self-improvement-loop/{journal.md,metrics.jsonl,backlog.jsonl,touched-files.jsonl,convergence.md,epochs/<NNN>/}`.

Keep epochs maintainer-grade: clean non-artifact start, real observations before selection, one evidence-backed framework change, patch manifest from `git diff`, mapped regression commands, command-backed `verify/result.json`, and stop rather than repeat low-value cleanup.

If the loop exposes a clear framework bug, use the interactive dev loop below for the patch and let the playbook verify the epoch.

## The dev loop

Eight steps, in order. Stay in this loop until the example passes cleanly or you hit a structural decision that needs the user.

### 1. Pick a test bed

If the user named a test fixture or example in the trigger phrase, use it. The smallest one that exercises the suspected subsystem is best — see the fixture→subsystem table at the bottom of `reference/framework-map.md`.

**Test fixtures** (under `tests/`) are the primary dev-loop test beds — they're small, fast, and have corresponding vitest runners. Prefer these for most framework debugging:

| Subsystem | Fixture |
|-----------|---------|
| Navigator / convergence | `tests/test-simple-run` |
| Compile / discovery / manifest | `tests/test-compile-discover` |
| Multi-provider / agentfn routing | `tests/test-mixed-model` |
| Seed / dynamic spawn | `tests/test-seeding`, `tests/test-queue-pattern` |
| Gap detection (input/output) | `tests/test-gap-blocked-input`, `tests/test-gap-missing-output` |
| Buggy-check relaxation | `tests/test-buggy-check` |
| Loop detection | `tests/test-loop-detection` |
| Multi-attempt convergence | `tests/test-multi-attempt` |
| Crash-safe resume | `tests/test-resume` |

**Full examples** (under `examples/`) are heavier multi-phase projects. Use when debugging end-to-end behavior that doesn't surface in a single fixture.

### 2. Build current state

```bash
cd <repo-root>
pnpm build
```

Confirm it exits clean. **If the build is already broken, that *is* the first bug** — skip to step 5 with the build error as the symptom.

For faster iteration when changes are scoped to one package:

```bash
pnpm --filter @converge/core build && pnpm --filter @converge/cli build
```

### 3. Run the test bed & monitor

From the test fixture or example directory:

```bash
cd tests/<fixture-name>
node <repo-root>/packages/cli/dist/index.js compile --dir=.converge/playbooks/default
node <repo-root>/packages/cli/dist/index.js run --dir=.
```

For fixtures that don't have a project dir at the top level, use the full paths:

```bash
node packages/cli/dist/index.js compile --dir=tests/<fixture>/.converge/playbooks/default
node packages/cli/dist/index.js run --dir=tests/<fixture>
```

Common flags for debugging:

| Flag | Use |
|---|---|
| `--force` | Force-run a task even if completed/cached |
| `--select <expr>` | Run only matching tasks (`--select '02-something+'` = task + descendants) |
| `--dry` | Plan only — show what would execute without running |
| `--full-refresh` | Ignore fingerprints, re-execute everything |
| `--verbose, -v` | Verbose output |

Arm a Monitor on the event stream:

```bash
tail -f .converge/target/<playbook>/events.jsonl | grep -E '(NODE_START|NODE_COMPLETE|NODE_FAIL|CHECK_FAIL|ERROR)'
```

Then — and this is what makes this skill different from `converge-control` — also read the *internal* state:

```bash
# DAG state after run
cat .converge/target/<playbook>/runstate.json

# Per-task forensics
ls .converge/target/<playbook>/tasks/<taskId>/
cat .converge/target/<playbook>/tasks/<taskId>/FEEDBACK.md
cat .converge/target/<playbook>/tasks/<taskId>/LEARN.md
```

Full observability surface: **`reference/observability.md`**.

### 4. Classify the symptom

| Symptom shape | Class | Action |
|---|---|---|
| Example completes cleanly, no anomalies | none | nothing to fix; ask the user what they wanted to investigate |
| Stale paths, missing inputs from user playbook | user-shape | wrong skill; route to **`converge-control`** |
| DAG runner crashes / unhandled exception during execution | framework | continue to step 5 |
| Runstate corruption (node status flip-flops, fingerprint mismatch cascade) | framework | continue to step 5 |
| Seed spawn fails despite valid `seed: { mode: cli }` task contract | framework | continue to step 5 |
| agentfn provider throws on a valid response | framework | continue to step 5 |
| Node retries without progress (same CHECK_FAIL across attempts) | framework | continue to step 5 |
| Fingerprint caching broken (unchanged node re-executed unnecessarily) | framework | continue to step 5 |
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

Clear target state from the failing run (so you're testing the fix, not a stale runstate):

```bash
# Remove target state for a clean re-run
rm -rf tests/<fixture>/.converge/target
rm -rf tests/<fixture>/.converge/journal
# Also clean output files the fixture may have produced
rm -f tests/<fixture>/*.txt
```

Or use the CLI for targeted cleanup:

```bash
node packages/cli/dist/index.js clean --select '*' --dir=tests/<fixture>
```

Re-run from step 3. Confirm:

- Original symptom is gone.
- No new symptoms appeared.
- Run reaches exit 0 clean.

**Run the existing vitest suite** for the subsystem you touched:

```bash
# Run tests for the fixture you're using
npx vitest run tests/<fixture-related>.test.ts

# Or run all tests (slower, use for hot-path changes)
npx vitest run tests/
```

If no vitest runner exists for the fixture, create one (see `tests/compile-discover.test.ts` for the pattern — compile + run + verify outputs).

If the symptom returns or a new one shows up → loop back to step 5.

### 8. Record the recipe

Append a new entry to **`troubleshooting/playbook.md`** in the format established there: **Symptom** / **Root cause** / **Fix** / **Verification** / **Files touched**. Skip if the fix was a one-off typo. The point is to grow institutional memory so the *next* invocation of this skill recognizes the symptom faster.

## Hard rules — STOP and re-route

- **Don't edit framework source without first reproducing the bug against an example.** No speculative fixes. The reproducible run is also the verification baseline for step 7.
- **Don't skip `pnpm build` between source edit and re-run.** The CLI binary runs from `packages/cli/dist/index.js`, not source. Edits to `packages/**/src/*.ts` have zero effect until rebuilt.
- **Don't `--full-refresh` the example mid-debug.** That ignores fingerprints and can mask caching bugs. Use `rm -rf .converge/target/<playbook>` to clear state for a clean re-run.
- **Don't bundle unrelated improvements.** One bug, one patch (CLAUDE.md §3 — surgical changes). If you notice adjacent dead code or a refactor opportunity, mention it to the user; don't ship it in the diagnostic fix.
- **Don't run `pnpm test` as a gate for every edit.** Too slow for the dev loop. But if your fix touches a hot path — `core/src/dag/`, `core/src/manifest/`, `core/src/journal/` — flag that to the user and suggest *they* run `pnpm test` before commit.
- **Don't leave `console.log` debugging in the source.** If you added logging to diagnose, remove it before declaring the fix done.
- **Apply known recipes; ask before novel ones.** If `troubleshooting/playbook.md` has a matching entry → apply and continue. If it doesn't, and the diagnosis crosses package boundaries → STOP, state hypothesis, wait for approval.
- **Use current terminology.** Single-target model: `target/{playbook}/` not `journal/{playbook}/executions/{id}/`. `runstate.json` not `checkpoint.json`. `DAG node` not `epic`. `fingerprint caching` not `resume checkpoint`.

## Testing

### Running tests

```bash
# All root-level integration tests
npx vitest run tests/

# Single test file (fast feedback)
npx vitest run tests/playbook-compile.test.ts

# Watch mode (re-run on file changes)
npx vitest tests/playbook-compile.test.ts

# Per-package unit tests
pnpm --filter @converge/core test
pnpm --filter @converge/agentfn test

# Full monorepo test suite
pnpm test
```

### Test file anatomy

Root-level tests live in `tests/*.test.ts`. They follow a pattern:

```ts
// 1. Spawn converge CLI with spawnSync
const CLI = resolve(__dirname, "..", "packages/cli/dist/index.js");
const result = spawnSync("node", [CLI, "run", "--dir=<dir>"], {
  cwd: REPO_ROOT, encoding: "utf-8",
  stdio: ["ignore", "pipe", "pipe"],
});

// 2. Verify outputs on disk
expect(existsSync(resolve(PROJECT_DIR, "EXPECTED_OUTPUT.txt"))).toBe(true);

// 3. Verify journal/manifest state
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
expect(manifest.nodes["task-id"]).toBeDefined();
```

**Key conventions:**
- Fixtures live under `tests/test-<name>/` with full `.converge/` structure
- Clean journal before each test (`beforeAll`), clean outputs after
- Use `describe.skip` + binary check for tests requiring external CLIs (claude, codex)
- `vitest.config.ts` has `fileParallelism: false` — tests run serially, safe to share fixture dirs
- For compile-only tests, use the parameterized pattern from `tests/playbook-compile.test.ts`
- For DAG structure tests, use the pattern from `tests/playbook-dag.test.ts`
- For seed/structure tests (no AI needed), use the pattern from `tests/playbook-seeds.test.ts`

### When to add tests

- **Always** when fixing a bug that manifested in a specific fixture — add a regression test
- **Always** when adding a new config schema field (`ai:`, new frontmatter key) — add a compile test
- **Optionally** when the fix is a comment, error message, or logging change
- **Never** skip adding a test for a bug that can reproduce deterministically

## Hand-off

| Situation | Hand off to |
|---|---|
| User wants to *run* a user playbook (not develop the framework) | **`converge-control`** |
| User wants bounded autonomous framework improvement | run `self-improvement-loop` here, then use its artifacts as evidence |
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
