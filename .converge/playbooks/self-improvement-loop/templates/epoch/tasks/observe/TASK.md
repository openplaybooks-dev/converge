---
id: "{{taskId}}"
title: "Observe framework behavior — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/observe/report.md"
  - "{{artifactsRel}}/observe/findings.json"
  - "{{artifactsRel}}/observe/metrics.json"
checks:
  - id: report-written
    cmd: "test -s {{artifactsRel}}/observe/report.md"
    description: Observation report exists
  - id: findings-valid
    cmd: "jq empty {{artifactsRel}}/observe/findings.json"
    description: Findings JSON is valid
  - id: has-findings-array
    cmd: "jq -e 'has(\"findings\") and (.findings | type == \"array\")' {{artifactsRel}}/observe/findings.json"
    description: Findings JSON has findings array
  - id: has-priority-finding
    cmd: "jq -e '(.findings | any(.severity == \"critical\" or .severity == \"high\" or .dimension == \"Correctness\" or .dimension == \"Determinism\" or .dimension == \"Production Readiness\" or .dimension == \"API\"))' {{artifactsRel}}/observe/findings.json"
    description: Observation includes at least one maintainer-grade finding
  - id: metrics-valid
    cmd: "jq empty {{artifactsRel}}/observe/metrics.json"
    description: Observation metrics JSON is valid
  - id: tests-inventoried
    cmd: "jq -e '(.test_inventory | type == \"array\") and (.test_inventory | length >= 1)' {{artifactsRel}}/observe/metrics.json"
    description: Observation metrics include tests inventory
---

# Observe framework behavior

Gather objective evidence before selecting a fix. Prefer real framework
behavior and tests under `/tests` over opinions. This stage is the maintainer's
triage pass: find work that would matter in a serious open-source project.

## Required probes

Run cheap, targeted probes first. Time-box observation: stop when you have one
high-confidence, high-value target with evidence. Do not keep probing just to
collect trivia.

```sh
cd {{projectDir}}
pnpm --filter @converge/cli build
pnpm --filter @converge/core build
find tests -maxdepth 1 -name '*.test.ts' | sort
pnpm vitest run tests/playbook-compile.test.ts
pnpm vitest run tests/playbook-dag.test.ts
pnpm vitest run tests/playbook-seeds.test.ts
pnpm vitest run tests/playbook-loop-seed.test.ts
node packages/cli/dist/index.js --help
```

Read existing ledgers first if present: `{{artifactsRootRel}}/journal.md`,
`metrics.jsonl`, `backlog.jsonl`, and `touched-files.jsonl`.

## Required maintainer probes

Pick at least one high-value probe from this menu; prefer the first probe whose
failure/weakness can be fixed in one small patch. Do not spend observation only
on help text or build-warning noise:

- invalid provider/model config should surface a clear actionable error;
- stale manifest behavior after editing a copied test fixture;
- cache invalidation after deleting declared outputs in a copied fixture;
- resume after seed-spawned child interruption;
- `--select parent+` includes dynamically spawned descendants;
- run lock cleanup after interrupted process;
- stop/clean behavior for a small copied playbook;
- compile manifest public semantics vs runtime DAG semantics;
- atomic runstate/manifest write behavior under interruption.

## Output

Write `{{artifactsRel}}/observe/report.md` with command excerpts, what passed,
what failed, and surprising behavior.

Write `{{artifactsRel}}/observe/metrics.json`:

```json
{
  "epoch": "{{epoch}}",
  "timestamp": "ISO",
  "build": {"cli": "pass|fail", "core": "pass|fail"},
  "test_inventory": ["tests/playbook-compile.test.ts"],
  "tests_run": [{"command": "pnpm vitest run tests/playbook-compile.test.ts", "result": "pass|fail"}],
  "risk_scores": {"safety": 1, "determinism": 1, "production": 1, "simplicity": 1, "dx": 1, "api": 1},
  "counts": {"open_backlog": 0, "repeated_files": 0, "recent_cosmetic_epochs": 0}
}
```

Write `{{artifactsRel}}/observe/findings.json`:

```json
{
  "epoch": "{{epoch}}",
  "probes": [{"command":"...", "result":"pass|fail", "notes":"..."}],
  "findings": [
    {
      "id": "short-id",
      "severity": "critical|high|medium|low",
      "dimension": "Correctness|Determinism|Production Readiness|Simplicity|DX|Documentation|API",
      "priority_class": "correctness|determinism|lifecycle|production|api|dx",
      "title": "...",
      "evidence": "specific command/output/file",
      "suggested_fix": "small actionable change",
      "candidate_files": ["packages/...", "tests/..."],
      "selected_test_command": "pnpm vitest run tests/<file>.test.ts",
      "regression_check": "command or test to add/run"
    }
  ]
}
```

If all probes pass, create a maintainer-grade finding for missing regression
coverage on a critical path. Do not create another build-warning/help-only
finding unless a higher-priority finding is impossible and explain why. If the
last two epochs were low-value or touched the same files, emit an escalation
finding instead of another cleanup candidate.
