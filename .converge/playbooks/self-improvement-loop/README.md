# self-improvement-loop

Test-driven autonomous framework optimization for Converge.

The playbook runs small, restartable epochs. It does not rely on a single long
context window: every epoch records observations, decisions, tests, changed
files, command exit codes, and verification results to durable artifacts.

## Goal

Continuously make Converge simpler and more production-ready for autonomous
AI-agent workflows:

1. safer run lifecycle;
2. deterministic DAG/spawn/resume behavior;
3. clear CLI/API contracts;
4. smaller, cleaner framework modules;
5. regression coverage under `/tests` for fixed behavior.

## Epoch loop

```text
000-observe → 001-select → 002-implement → 003-verify
```

| Stage | Role |
|---|---|
| `observe` | Gather evidence from builds, `/tests`, dry-runs, targeted probes, journal history, and backlog. |
| `select` | Pick exactly one highest-value test-backed improvement with acceptance checks and non-goals. |
| `implement` | Write/strengthen the regression when needed, make the minimal source/API cleanup, and write a patch manifest. |
| `verify` | Run mechanical build + selected `/tests` gates, write command-backed results, append ledgers. |

## Durable memory

```text
.converge/artifacts/self-improvement-loop/
  journal.md
  metrics.jsonl
  backlog.jsonl
  touched-files.jsonl
  convergence.md
  epochs/<NNN>/...
```

These files are the loop memory. Future epochs must read them before selecting work.

## Good autonomous targets

- stale manifest invalidation;
- cache invalidation when outputs are missing;
- run lock / stop / clean lifecycle;
- spawned child materialization and resume;
- deterministic `--select` semantics;
- actionable CLI error messages;
- atomic manifest/runstate writes;
- focused regression tests under `/tests`;
- simple module-boundary or API cleanup backed by evidence.

## Bad autonomous targets

- cosmetic rewrites;
- broad speculative refactors;
- weakening checks or types;
- project-specific hacks in `packages/`;
- editing generated `dist/` instead of source;
- touching many files without a refactor proposal;
- claiming success without `verify/result.json` command evidence.

## Run

```sh
converge run --playbook=self-improvement-loop --select improve+
```

The loop is intentionally bounded in `playbook.yml`; run repeated bounded
sessions instead of one unbounded autonomous process.

## Maintainer-grade autonomous policy

This loop is tuned for small, reviewable framework hardening patches, like a
senior maintainer would accept in an infrastructure project. Each epoch must:

1. start from a clean non-artifact diff;
2. observe real commands/tests before selecting work;
3. prioritize failures, lifecycle correctness, DAG/seed determinism, provider
   production readiness, and API contract drift before docs/DX;
4. avoid repeating the same low-value class across consecutive epochs;
5. generate `implement/patch-manifest.json` from `git diff`, not memory;
6. run mapped regression suites for the changed area;
7. write an epoch summary plus JSONL ledgers for durable handoff.

If only cosmetic, help-text, or build-warning cleanup remains after two recent
low-value epochs, the loop should stop with `needs human backlog/priority
update` instead of continuing unattended.

