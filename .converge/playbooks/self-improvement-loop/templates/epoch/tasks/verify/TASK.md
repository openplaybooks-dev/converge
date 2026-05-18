---
id: "{{taskId}}"
depends_on:
  - "{{implementTaskId}}"
title: "Verify correction — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/analyze/correction-spec.json"
  - "{{artifactsRel}}/implement/patch-manifest.json"
outputs:
  - "{{artifactsRel}}/verify/result.json"
  - "{{artifactsRel}}/verify/result.md"
checks:
  - id: result-json-valid
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs empty {{artifactsRel}}/verify/result.json"
    description: Verification result is valid JSON
  - id: all-commands-passed
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e '.result == \"pass\" and all(.commands[]; .exit_code == 0)' {{artifactsRel}}/verify/result.json"
    description: All verification commands returned exit code 0
  - id: test-command-ran
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e --arg t \"$(jq -r '.test_file' {{artifactsRel}}/analyze/correction-spec.json)\" '[.commands[].cmd] | map(select(contains($t))) | length >= 1' {{artifactsRel}}/verify/result.json"
    description: The correction's test was actually run
  - id: no-self-modification
    cmd: '! git -C {{projectDir}} diff --name-only -- .converge/playbooks/self-improvement-loop/ | grep -q .'
    description: Zero changes to self-improvement playbook
  - id: journal-appended
    cmd: "grep -q '## Epoch {{epoch}}' {{artifactsRootRel}}/journal.md"
    description: Journal has this epoch entry
  - id: metrics-appended
    cmd: 'grep -q ''"epoch":"{{epoch}}"'' {{artifactsRootRel}}/metrics.jsonl'
    description: Metrics ledger has this epoch
  - id: result-md-written
    cmd: "test -s {{artifactsRel}}/verify/result.md"
    description: Human-readable verification report exists
on-fail:
  reset:
    - "{{implementTaskId}}"
---

# Verify the correction

Run the verification commands. The test written in the implement phase MUST pass.
If it doesn't, the correction is invalid — reset to implement and try again.

## Default gates

```sh
cd {{projectDir}}
pnpm --filter @openplaybooks/converge build
pnpm --filter @openplaybooks/converge-core build
# The test from correction-spec.json:
pnpm vitest run $(node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -r '.test_file' {{artifactsRel}}/analyze/correction-spec.json)
```

## Mental model verification

The test must prove the mental model is now ENFORCED by the framework, not just
that one bug is fixed. Ask:
- Does this test fail BEFORE the code change? (proves the gap existed)
- Does it pass AFTER? (proves the gap is closed)
- Would a similar violation of the same mental model ALSO be caught by this
  or a similar test? (proves the correction has leverage)

## Update durable ledgers

1. Write `{{artifactsRel}}/verify/result.json`:
```json
{
  "epoch": "{{epoch}}",
  "mental_model": "Checks, Not Vibes",
  "result": "pass",
  "finding_id": "weak-checks-only-check-existence",
  "commands": [
    {"cmd": "pnpm --filter @openplaybooks/converge build", "exit_code": 0, "duration_ms": 2000},
    {"cmd": "pnpm --filter @openplaybooks/converge-core build", "exit_code": 0, "duration_ms": 4000},
    {"cmd": "pnpm vitest run tests/playbook-output-validation.test.ts", "exit_code": 0, "duration_ms": 1500}
  ],
  "changed_files": ["tests/playbook-output-validation.test.ts", "packages/core/src/task/unit/find-gaps.ts"],
  "test_added": true,
  "mental_model_enforced": true
}
```

2. Write `{{artifactsRel}}/verify/result.md` — short, with command output excerpts.

3. Append `## Epoch {{epoch}}` to `{{artifactsRootRel}}/journal.md` (idempotent).

4. Append one JSON line to `{{artifactsRootRel}}/metrics.jsonl` (idempotent):
```json
{"epoch":"{{epoch}}","mental_model":"Checks, Not Vibes","result":"pass","finding_id":"weak-checks-only-check-existence","test_added":true,"files_changed":2}
```

5. Append each changed file to `{{artifactsRootRel}}/touched-files.jsonl`.

6. If the test still fails after the code change, add to `{{artifactsRootRel}}/escalated.json`.
