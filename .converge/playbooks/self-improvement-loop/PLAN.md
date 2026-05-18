# PLAN — self-improvement-loop

## Mission

Run a bounded, test-driven autonomous improvement loop that steadily makes
Converge simpler, safer, and more production-ready as a framework for
repeatable AI-agent workflows.

Each epoch must behave like a senior developer who knows the project:

1. inspect real framework behavior and existing tests under `/tests`;
2. choose exactly one broken or under-specified behavior;
3. write or strengthen the regression test first when needed;
4. implement the smallest correct framework/API cleanup;
5. prove success with command-backed verification artifacts.

README north star:

- **Playbooks, not prompts** — reusable markdown/folder blueprints.
- **Checks, not vibes** — shell checks decide done.
- **DAG, not context window** — deterministic topological execution, spawned children, and resume.
- **Fingerprint caching** — incremental runs must be explainable and safe.
- **Dynamic scope** — seed-spawned work must be inspectable and resumable.

## Architecture for many epochs

Do not rely on one agent's context window. Every epoch writes structured
artifacts that the next epoch can read.

```text
preflight → observe → select → implement → verify → record
    ↑                                           │
    └──────────── backlog / metrics / tests ───┘
```

Durable state:

```text
.converge/artifacts/self-improvement-loop/
  journal.md                 # human-readable history
  metrics.jsonl              # one machine-readable metric event per verified epoch
  backlog.jsonl              # discovered opportunities, including deferred items
  touched-files.jsonl        # file-change frequency for refactor signals
  convergence.md             # trajectory generated from verified ledgers
  epochs/<NNN>/
    observe/report.md
    observe/findings.json
    observe/metrics.json
    analyze/improvement-spec.json
    analyze/report.md
    implement/patch-manifest.json
    verify/result.json       # command exit-code evidence
    verify/result.md         # human-readable verification report
    epoch-summary.md
```

## Optimization policy

Each epoch chooses exactly one improvement. Prefer test-backed work in this order:

1. **Safety/correctness:** run locks, stop/clean, stale manifests, false cache hits, journal/runstate corruption.
2. **Determinism:** DAG discovery, `--select`, spawned children, retry, resume, dry-run explanation.
3. **Production readiness:** actionable errors, atomic writes, child-process cleanup, focused regression coverage.
4. **API cleanliness:** remove confusing public surfaces, align CLI/API behavior, simplify contracts.
5. **Simplicity/DX/docs:** remove special cases, clarify boundaries, help/docs match behavior.

## Required test discipline

Every source-changing epoch must do at least one of the following:

- add or update a Vitest regression under `/tests`;
- add or update a fixture under `/tests/test-*`;
- select and run an existing `/tests/*.test.ts` file that covers the changed behavior;
- explain in `verify/result.json.regression_exception` why no test change is appropriate.

Preferred commands:

```sh
pnpm --filter @openplaybooks/converge-cli build
pnpm --filter @openplaybooks/converge-core build
pnpm vitest run tests/<selected>.test.ts
```

Use full workspace tests only when the selected spec requires it; keep epochs fast.

## Guardrails

Hard limits per epoch:

- one selected target;
- default maximum 3 source files changed, plus tests/docs/fixtures if needed;
- no public API rename unless selected spec marks risk as accepted;
- no generated `dist/` edits as source of truth;
- no weakened tests/checks/types;
- no `any`, `as any`, `@ts-ignore`, or broad catch-and-ignore to hide errors;
- no credential/token additions;
- if a fix wants >5 source files, defer it as a refactor proposal instead of implementing.

## Stage contract

### 000-observe

Runs cheap probes, reads durable history, inventories `/tests`, and writes
findings plus metrics. It may discover many issues but must not choose the fix.

### 001-select

Ranks findings + backlog, chooses one target, names the exact `/tests` command
that will prove the work, and writes an implementation spec with acceptance
checks and non-goals.

### 002-implement

Applies only the selected spec. If the selected behavior lacks coverage, write
the regression test or fixture first, then make the smallest framework/API
change. Write a patch manifest that must match `git diff`.

### 003-verify

Runs default build gates plus the selected `/tests` command. Writes
`verify/result.json` with real command exit codes, appends ledgers, and records
refactor signals. An epoch is not complete without passing verify artifacts.

## Refactor escalation

Do not let many epochs become endless patching. Recommend a larger refactor when
two or more signals are true:

- same file touched in 3+ epochs;
- same failure class repeats in 3+ epochs;
- same dimension remains ≤ 2/5 in 3+ epochs;
- verification fails twice for same selected target;
- proposed fix would touch >5 source files.

Refactor proposals are backlog items. They still require a future epoch to
select and scope them safely.

## Running strategy

Run bounded sessions, not an infinite process. The ledger artifacts make
restarts cheap and keep context externalized.

```sh
converge run --playbook=self-improvement-loop --select improve+
```
