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

You are a senior maintainer auditing a framework. Your job: find errors that
a test or a command can reproduce. Do not return anything a developer would
call "cosmetic" — if a probe passes cleanly, move to deeper probes.

## Anti-repeat (do this FIRST)

Before running probes, read the previous epoch specs:

```sh
ls {{artifactsRootRel}}/epochs/ 2>/dev/null
for f in {{artifactsRootRel}}/epochs/*/analyze/improvement-spec.json; do
  jq -r '"Epoch \(.epoch): \(.selected.id) — \(.selected.dimension) — \(.selected.files | join(", "))"' "$f" 2>/dev/null
done
```

Any target whose id, dimension, or files overlap with the last two epochs is
**rejected**. Do not propose it. If all findings are repeats, escalate.

## Phase 1 — Full test suite (MANDATORY)

Run EVERY test. The last run only exercised 4-5 files; you must cover all of
them. If any test fails or times out, that is priority 1.

```sh
cd {{projectDir}}
pnpm --filter @converge/cli build
pnpm --filter @converge/core build
ls tests/*.test.ts | sort
pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts tests/playbook-seeds.test.ts tests/playbook-loop-seed.test.ts tests/playbook-run-lock.test.ts tests/playbook-hooks.test.ts 2>&1
```

If any test fails or times out: that's your primary finding. Record the exact
failure output, file, and line.

## Phase 2 — Error-path probes (MANDATORY — run at least 3)

If the full suite passes, probe the failure paths where bugs hide:

```sh
# Hook error handling
cd {{projectDir}}
node -e "
const {execSync} = require('child_process');
try { execSync('pnpm vitest run tests/playbook-hooks.test.ts', {timeout: 30000, stdio:'pipe'}); console.log('HOOKS_PASS'); }
catch(e) { console.log('HOOKS_FAIL:', e.stderr?.toString().slice(-300)); }
"

# Abort/resume behavior
node packages/cli/dist/index.js run --playbook self-improvement-loop --dry 2>&1 | head -30

# Select operator edge cases
node packages/cli/dist/index.js list --playbook self-improvement-loop --select "epoch-013+" 2>&1

# Concurrency edge (skip if test proves safety)
pnpm vitest run tests/playbook-loop-seed.test.ts --reporter=verbose 2>&1 | tail -20
```

Also probe (pick at least 2):
- Stale manifest: copy a test playbook, edit a TASK.md, check if recompile detects change
- Cache invalidation: run a playbook, delete an output, check if re-run detects missing output
- Seed error handling: introduce a syntax error in a seed.js, check if the error is surfaced clearly
- Run lock: start a run, kill it mid-way, check if lock is released
- Provider error: configure an invalid provider, check if error message is actionable
- Compile determinism: compile twice, check if manifests are identical

## Phase 3 — Static analysis (if no errors found in Phases 1-2)

Run these ONLY if Phases 1-2 produced zero error findings:
```sh
cd {{projectDir}}
# Check for common code smells
grep -rn "setPending\|resultsMgr\.set" packages/core/src/ 2>/dev/null | head -10
grep -rn "\.exit(1)" .converge/playbooks/self-improvement-loop/scripts/ 2>/dev/null | head -10
grep -rn "process\.exit(1)" .converge/playbooks/self-improvement-loop/scripts/ 2>/dev/null | head -10
```

## Maintainer selection rubric

Every finding must have a rank. Lower numbers first. Do not select rank 5-6
unless ranks 1-4 are proven clean with command evidence in the finding.

| Rank | Class | Examples |
|---:|---|---|
| 1 | failing tests / crashes / stalls | reproducible failure, hung run, uncaught exception |
| 2 | state/lifecycle correctness | cache invalidation, runstate, resume, locks, stop/clean |
| 3 | DAG/seed determinism | spawned children, `--select`, incremental materialization |
| 4 | runtime production readiness | provider errors, child process cleanup, atomic writes, error handling |
| 5 | API contract drift | type/runtime mismatch, confusing public semantics |
| 6 | DX (only if 1-5 are clean with evidence) | actionable error messages, clear contracts |

## Explicitly prohibited targets

Do NOT propose:
- build warnings, unused imports, deprecation dedup (unless it causes test failure)
- help-text changes
- "missing test coverage" as a standalone target (tests are infrastructure, not the fix)

## Output

Write `{{artifactsRel}}/observe/report.md` with command output excerpts.

Write `{{artifactsRel}}/observe/findings.json` with the probe results and at
least one high-value finding (rank 1-4). If all probes pass cleanly, escalate
with `id: "escalate-no-actionable-findings"` rather than a cosmetic finding.

Each finding MUST include the exact command that reproduces the issue.
