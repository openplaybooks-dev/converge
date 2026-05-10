---
id: "{{taskId}}"
depends_on:
  - "{{observeTaskId}}"
title: "Select one maintainer-grade improvement — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/observe/findings.json"
  - "{{artifactsRel}}/observe/report.md"
  - "{{artifactsRel}}/observe/metrics.json"
outputs:
  - "{{artifactsRel}}/analyze/improvement-spec.json"
  - "{{artifactsRel}}/analyze/report.md"
checks:
  - id: spec-valid
    cmd: "jq empty {{artifactsRel}}/analyze/improvement-spec.json"
    description: Improvement spec JSON is valid
  - id: spec-has-one-target
    cmd: "jq -e 'has(\"selected\") and (.selected.files | length >= 1) and (.selected.acceptance_checks | length >= 1)' {{artifactsRel}}/analyze/improvement-spec.json"
    description: Spec has one selected target with files and checks
  - id: spec-has-test-command
    cmd: "jq -e '.selected.test_command | strings | startswith(\"pnpm vitest run tests/\")' {{artifactsRel}}/analyze/improvement-spec.json"
    description: Spec chooses a focused Vitest command under tests/
  - id: maintainer-quality-gate
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-selection-quality.mjs {{artifactsRel}}/analyze/improvement-spec.json {{artifactsRootRel}}/metrics.jsonl {{artifactsRootRel}}/touched-files.jsonl"
    description: Selection is high-value, evidence-backed, mapped to tests, and not repetitive
  - id: selected-from-observed-finding
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-selected-finding.mjs {{artifactsRel}}/analyze/improvement-spec.json {{artifactsRel}}/observe/findings.json"
    description: Selected target is one of the observed findings
  - id: report-written
    cmd: "test -s {{artifactsRel}}/analyze/report.md"
    description: Selection report exists
---

# Select one maintainer-grade improvement

Read observation artifacts plus durable ledgers at `{{artifactsRootRel}}/journal.md`,
`metrics.jsonl`, `backlog.jsonl`, and `touched-files.jsonl`. Choose exactly one
improvement that a senior open-source maintainer would accept as moving the
framework toward production readiness. The selected `id` must come directly from
`observe/findings.json`; do not invent a different target during selection.

## Maintainer standard

Act like a senior maintainer reviewing a critical infrastructure patch. Optimize
for the kind of small, reviewable, high-leverage patches expected in serious
open-source infrastructure: one bug class, clear evidence, a regression, a
minimal implementation, and no churn.


- fix real correctness, determinism, lifecycle, API, or safety problems;
- prefer patches that make future bugs impossible or obvious;
- require a focused regression or a strong existing test suite;
- avoid churn, style-only cleanups, and repeated low-value DX work;
- keep the public contract stable unless the spec explicitly accepts risk;
- make the selected fix small enough to review in one sitting.

## Selection priority

Pick the highest priority item with concrete evidence, in this order:

1. **Failing test, crash, or stalled run root cause.**
2. **State/lifecycle correctness:** cache invalidation, runstate/journal integrity, resume, locks, stop/clean.
3. **DAG/seed determinism:** spawned child materialization, `--select`, incremental seed loops, parent completion.
4. **Provider/runtime production readiness:** clear provider/model errors, child-process cleanup, atomic writes.
5. **API contract cleanup:** remove confusing surfaces or type drift with regression coverage.
6. **Docs/DX only when no stronger framework target exists.**

## Explicitly disallowed unless all higher priorities are clean

Do not select these as standalone targets:

- build-warning noise;
- unused-import cleanup;
- help-text-only changes;
- formatting/cosmetic rewrites;
- another change in the same failure class as either of the last two epochs.

If only low-value findings are available, select a missing regression for a
critical path instead: seed loops, compile manifests, DAG selection, run locks,
provider failures, or cache invalidation.

## Required evidence and anti-repeat check

`selected.why_now` must include the word `evidence` and cite a command, file,
ledger entry, or failing/weak behavior. Do not rely on intuition alone.

Before selecting, inspect `metrics.jsonl` and `touched-files.jsonl`:

- if the same `dimension`, `selected_id` pattern, or file appears in the last two epochs, reject similar candidates;
- if a file appears in 3+ epochs, select a small root-cause refactor or write a backlog refactor proposal;
- never spend two consecutive epochs on cosmetic/DX cleanup;
- if the only available target is low-value cleanup, stop and write an escalation backlog item instead of editing code.

## Test mapping

Choose the focused test command by affected area:

- `packages/core/src/run.ts`, seed execution, runstate, loop behavior → `pnpm vitest run tests/playbook-loop-seed.test.ts tests/playbook-seeds.test.ts`
- manifest/DAG/compile behavior → `pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts`
- CLI command/help behavior → `pnpm vitest run tests/cli-help.test.ts`
- provider/agent failure behavior → add/run a focused provider failure test under `tests/`.

## Output

Write `{{artifactsRel}}/analyze/improvement-spec.json`:

```json
{
  "epoch": "{{epoch}}",
  "selected": {
    "id": "finding-id",
    "priority_class": "correctness|determinism|lifecycle|production|api|dx",
    "dimension": "Correctness",
    "goal": "one sentence outcome",
    "why_now": "evidence, priority rationale, and why this is not repeated low-value cleanup",
    "files": ["packages/cli/src/main.ts", "tests/playbook-compile.test.ts"],
    "test_command": "pnpm vitest run tests/playbook-compile.test.ts",
    "test_strategy": "add failing regression first|run existing coverage|fixture-only with explanation",
    "non_goals": ["what not to change"],
    "implementation_steps": ["small ordered steps"],
    "acceptance_checks": [
      "pnpm --filter @converge/cli build",
      "pnpm --filter @converge/core build",
      "pnpm vitest run tests/playbook-compile.test.ts"
    ],
    "risk": "low|medium|high",
    "rollback_plan": "how to revert safely",
    "ledger_updates": {"backlog_items_to_add": [], "backlog_items_to_close": []}
  }
}
```

Write `{{artifactsRel}}/analyze/report.md` with rejected alternatives and a
short maintainer rationale.
