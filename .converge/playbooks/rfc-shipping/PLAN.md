# PLAN — rfc-shipping

## Mission

Ship one human-Accepted RFC per epoch as a reviewable git branch + PR.
Each epoch picks the highest-priority Accepted RFC, creates `rfc/NNNN-<slug>`,
applies the RFC's Implementation steps to source, runs the RFC's Test plan,
and opens a PR via `gh pr create`. Tests with one recoverable failure still
ship behind a `tests-failing` label; blocked failures preserve the branch
without a PR.

The human is the merge authority. This playbook NEVER auto-merges.

## Architecture

```
pick-rfc → branch → rebase-check → implement → test → pr-open
   │           │           │            │         │       │
   │selected-  │branch.json│ citation-  │ patch-  │ test- │ pr.json
   │  rfc.json │           │ report.json│manifest │result │ + RFC
   │           │           │            │ .json   │ .json │ status flip
   └─── deterministic sort: priority_tier, estimate, accepted_at ─────┘
```

Durable state:

```text
.converge/artifacts/rfc-shipping/
  journal.md
  shipped.jsonl              # one row per merged RFC
  stale.jsonl                # one row per demoted-stale RFC
  epochs/<NNN>/
    pick/selected-rfc.json
    branch/branch.json
    rebase-check/citation-report.json
    implement/patch-manifest.json
    test/test-result.json
    pr-open/pr.json
    epoch-summary.md
```

## Selection determinism

Among RFCs with `status: accepted` AND no existing `rfc/NNNN-*` branch:

1. Sort by `priority_tier` ASC (critical < tier0 < tier1 < tier2 < tier3).
2. Then by numeric `estimate` ASC.
3. Then by `accepted_at` timestamp ASC.
4. First in the sorted list wins.

Given identical inputs, two invocations must pick the same RFC. The pick task
has a golden-test check that compares its output to a re-run of the sort.

## Express lane for `type: chore`

When the top-of-queue is `type: chore`, the pick task may bundle up to 5
chore RFCs into one batch. The batch:
- shares one branch `rfc/chore-batch-<timestamp>`
- one PR titled `chore: batch of N (RFCs #X, #Y, ...)`
- skips `rebase-check` (chore RFCs may not cite specific lines)
- enforces hard ceiling: total diff < 50 LOC; no high-risk files

Any chore breaching the ceiling demotes to the normal pipeline.

## Failure-mode trichotomy

The `test` task classifies the test run into one of three outcomes:

| Outcome | Meaning | PR opened? | RFC status |
|---|---|---|---|
| `pass` | all commands exit 0 | yes | `accepted → implementing` |
| `fail_recoverable` | one test red, no compile errors, diff bounded | yes (with `tests-failing` label) | `accepted → implementing-needs-human` |
| `fail_blocked` | compile error, framework broken, or load-bearing test red | no — branch preserved | reverts to `accepted` |

This prevents flaky tests from forfeiting implementation work that's already
been done.

## Self-modification guardrails

The shipping playbook cannot modify itself. The `implement` task fails if its
patch manifest touches:

- `.converge/playbooks/rfc-ideation/**`
- `.converge/playbooks/rfc-shipping/**`

It MAY modify `packages/`, `examples/`, `tests/`, `docs/`, etc. — that is its
job.

High-risk files (e.g. `packages/core/src/orchestrator/spawn*.ts`,
`packages/core/src/seed/cli-spawn.ts`) require the RFC to declare
`risk: high`. The PR body includes a `framework-core-ok` checkbox the human
must tick before merge.

## Running

```sh
converge run --playbook=rfc-shipping --select ship+
```

Recommended cadence: on-demand, or once daily after the human catches up on
acceptances. NOT hourly — too aggressive for review bandwidth.
