# PLAN — self-improvement epoch {{epoch}}

## Goal

Complete one safe, test-backed framework/API improvement and record enough
durable state that the next epoch can continue without relying on context
memory.

## Pipeline

```text
000-observe → 001-select → 002-implement → 003-verify → 004-summarize
```

## Outputs

- `observe/findings.json`: evidence and candidate improvements.
- `analyze/improvement-spec.json`: exactly one selected target and one selected `/tests` command.
- `implement/patch-manifest.json`: what changed and why, matching `git diff`.
- `verify/result.json`: command exit codes and machine-readable result.
- `verify/result.md`: human-readable verification report.
- `epoch-summary.md`: mandatory durable handoff after verification.
- `journal.md`, `metrics.jsonl`, `backlog.jsonl`, `touched-files.jsonl`: cross-epoch memory.

## Safety rule

If the selected improvement is too large, convert it to a backlog/refactor
proposal and implement a smaller guard, test, or documentation improvement
instead. Do not claim completion without passing verify commands.
