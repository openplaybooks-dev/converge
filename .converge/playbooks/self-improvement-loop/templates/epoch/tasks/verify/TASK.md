---
id: "{{taskId}}"
depends_on:
  - "{{implementTaskId}}"
title: "Verify selected improvement — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/analyze/improvement-spec.json"
  - "{{artifactsRel}}/implement/patch-manifest.json"
  - "{{artifactsRel}}/observe/metrics.json"
outputs:
  - "{{artifactsRel}}/verify/result.json"
  - "{{artifactsRel}}/verify/result.md"
checks:
  - id: result-json-valid
    cmd: "jq empty {{artifactsRel}}/verify/result.json"
    description: Machine-readable verification result is valid JSON
  - id: result-json-passed
    cmd: "jq -e '.result == \"pass\" and (.commands | length >= 3) and all(.commands[]; .exit_code == 0)' {{artifactsRel}}/verify/result.json"
    description: Verification JSON records passing command exit codes
  - id: patch-manifest-regenerated
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/generate-patch-manifest.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json {{artifactsRel}}/analyze/improvement-spec.json"
    description: Patch manifest is regenerated from git diff before verification checks
  - id: selected-test-ran
    cmd: 'selected=$(jq -r ''.selected.test_command'' {{artifactsRel}}/analyze/improvement-spec.json); jq -e --arg cmd "$selected" ''[.commands[].cmd] | index($cmd) != null'' {{artifactsRel}}/verify/result.json'
    description: The selected focused Vitest command ran
  - id: result-md-written
    cmd: "test -s {{artifactsRel}}/verify/result.md"
    description: Human verification result recorded
  - id: journal-appended
    cmd: "grep -q '## Epoch {{epoch}}' {{artifactsRootRel}}/journal.md"
    description: Shared journal has this epoch entry
  - id: metrics-appended
    cmd: 'grep -q ''"epoch":"{{epoch}}"'' {{artifactsRootRel}}/metrics.jsonl'
    description: Metrics ledger has this epoch
  - id: metrics-jsonl-valid
    cmd: 'test ! -s {{artifactsRootRel}}/metrics.jsonl || while IFS= read -r line; do printf ''%s\n'' "$line" | jq empty || exit 1; done < {{artifactsRootRel}}/metrics.jsonl'
    description: Metrics ledger is valid JSONL
  - id: backlog-jsonl-valid
    cmd: 'test ! -s {{artifactsRootRel}}/backlog.jsonl || while IFS= read -r line; do printf ''%s\n'' "$line" | jq empty || exit 1; done < {{artifactsRootRel}}/backlog.jsonl'
    description: Backlog ledger is valid JSONL
  - id: touched-files-jsonl-valid
    cmd: 'test ! -s {{artifactsRootRel}}/touched-files.jsonl || while IFS= read -r line; do printf ''%s\n'' "$line" | jq empty || exit 1; done < {{artifactsRootRel}}/touched-files.jsonl'
    description: Touched-files ledger is valid JSONL
  - id: result-files-match-patch
    cmd: "jq -e --slurpfile patch {{artifactsRel}}/implement/patch-manifest.json '([.changed_files[]] | sort) == ([$patch[0].files_changed[]] | sort)' {{artifactsRel}}/verify/result.json"
    description: Verification changed_files match patch manifest
  - id: verification-strength
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-verification-strength.mjs {{artifactsRel}}/analyze/improvement-spec.json {{artifactsRel}}/implement/patch-manifest.json {{artifactsRel}}/verify/result.json"
    description: Verification ran mapped regression suites for the changed area
on-fail:
  reset:
    - "002-implement"
---

# Verify selected improvement

Run the selected acceptance checks from `improvement-spec.json`, plus the default gates. Verification is not allowed to substitute a different focused test unless the spec is updated first. Regenerate the patch manifest from git diff before recording results so changed-file evidence is not agent-authored from memory.

## Default gates

Run these commands and record their exit codes in `result.json`. Treat this
as review evidence for a maintainer: the command list must prove the changed
area, not merely prove that one unrelated test still passes.

```sh
cd {{projectDir}}
pnpm --filter @converge/cli build
pnpm --filter @converge/core build
<selected test command from improvement-spec.json, e.g. pnpm vitest run tests/playbook-compile.test.ts>
```

If the selected spec names additional cheap regression commands, run them too.
For core runner/DAG/seed changes, include the mapped regression suites from the
selection test mapping. For source changes, either add/strengthen a regression
or write a specific `regression_exception` explaining why existing coverage is
strong enough. Verification must be command-backed: do not claim success
without exit codes.

## Update durable ledgers

Create parent directories as needed.

1. Write `{{artifactsRel}}/verify/result.json`:

```json
{
  "epoch": "{{epoch}}",
  "result": "pass",
  "selected_id": "...",
  "commands": [
    {"cmd": "pnpm --filter @converge/cli build", "exit_code": 0, "duration_ms": 1200, "notes": "..."},
    {"cmd": "pnpm --filter @converge/core build", "exit_code": 0, "duration_ms": 1200, "notes": "..."},
    {"cmd": "pnpm vitest run tests/playbook-compile.test.ts", "exit_code": 0, "duration_ms": 1200, "notes": "..."}
  ],
  "changed_files": ["packages/...", "tests/..."],
  "regression_added": true,
  "regression_exception": null,
  "refactor_signal": "NONE"
}
```

2. Write `{{artifactsRel}}/verify/result.md` with command results and evidence.
3. Idempotency check: if `grep -q '## Epoch {{epoch}}' {{artifactsRootRel}}/journal.md` succeeds, skip journal append (entry already exists). Otherwise, append a concise `## Epoch {{epoch}}` section to `{{artifactsRootRel}}/journal.md`.
4. Idempotency check: if `grep -q '"epoch":"{{epoch}}"' {{artifactsRootRel}}/metrics.jsonl` succeeds, skip metrics append (entry already exists). Otherwise, append one JSON line to `{{artifactsRootRel}}/metrics.jsonl`:

```json
{"epoch":"{{epoch}}","result":"pass","dimension":"Correctness","selected_id":"...","files_changed":2,"regression_added":true,"test_command":"pnpm vitest run tests/playbook-compile.test.ts","cli_build":"pass","core_build":"pass","test_result":"pass","refactor_signal":"NONE"}
```

5. Append each changed file as one JSON line to `{{artifactsRootRel}}/touched-files.jsonl`:

```json
{"epoch":"{{epoch}}","file":"packages/cli/src/main.ts","reason":"run lock guard"}
```

6. Append unresolved/deferred items to `{{artifactsRootRel}}/backlog.jsonl`:

```json
{"epoch":"{{epoch}}","id":"...","dimension":"Architecture","reason":"too large for one epoch","suggested_scope":"..."}
```

## Result format

```markdown
# Verify — Epoch {{epoch}}

**Result:** PASSED | FAILED

## Selected improvement
- ID:
- Goal:
- Files changed:
- Test command:

## Commands run
| Command | Exit code | Result | Notes |
|---|---:|---|---|

## Evidence
Relevant excerpts.

## Ledger updates
- journal: appended
- metrics: appended
- touched files: appended
- backlog: none | appended

## Refactor signal
NONE | <specific evidence>
```
