---
id: "{{taskId}}"
title: "Run RFC test plan and classify outcome — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/test/test-result.json"
checks:
  - id: test-result-recorded
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.outcome != null' {{artifactsRel}}/test/test-result.json"
    description: Test result recorded
  - id: outcome-is-valid-class
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.outcome == \"pass\" or .outcome == \"fail_recoverable\" or .outcome == \"fail_blocked\" or .outcome == \"skipped\"' {{artifactsRel}}/test/test-result.json"
    description: Outcome is one of pass | fail_recoverable | fail_blocked | skipped
---

# Run the RFC's Test plan

Read the RFC body. Extract its `## Test plan` section. The Test plan typically
names specific files (`tests/<name>.test.ts`) or shell commands.

## Execute

For each test command in the Test plan, run it and capture exit code +
stdout/stderr. Use the build commands from the existing playbook conventions:

```sh
cd {{projectDir}}
pnpm --filter @openplaybooks/converge build 2>&1 | tee {{artifactsRel}}/test/build.log; BUILD_EXIT=${PIPESTATUS[0]}
pnpm --filter @openplaybooks/converge-core build 2>&1 | tee -a {{artifactsRel}}/test/build.log; CORE_EXIT=${PIPESTATUS[0]}
# Run RFC-specific test commands here:
# pnpm vitest run tests/<selected>.test.ts 2>&1 | tee {{artifactsRel}}/test/vitest.log; TEST_EXIT=${PIPESTATUS[0]}
```

## Classify

Write `{{artifactsRel}}/test/test-result.json` with one of three outcomes:

```sh
node {{projectDir}}/.converge/playbooks/rfc-shipping/scripts/classify-test-result.mjs \
  --build-log {{artifactsRel}}/test/build.log \
  --test-log {{artifactsRel}}/test/vitest.log \
  --diff-stats {{artifactsRel}}/test/diff-stats.txt \
  --out {{artifactsRel}}/test/test-result.json
```

The classifier:

| Signal | Outcome |
|---|---|
| Build exits 0, all tests exit 0 | `pass` |
| Build exits 0, at most 1 test red, no load-bearing file failures | `fail_recoverable` |
| Build exits non-0, OR >1 tests red, OR any test in `packages/core/src/orchestrator/`, `packages/core/src/seed/`, or `packages/core/src/run/` failed | `fail_blocked` |

Result shape:

```json
{
  "outcome": "pass" | "fail_recoverable" | "fail_blocked",
  "build_exit": 0,
  "test_exit": 0,
  "failed_tests": [],
  "load_bearing_failures": [],
  "evidence": {
    "build_log_tail": "<last 50 lines>",
    "test_log_tail": "<last 50 lines>"
  }
}
```

## Short-circuit

If the implement task short-circuited (`outcome: cannot-apply` and zero
diff), write:

```json
{"outcome":"skipped","reason":"no-implementation-to-test"}
```

and let pr-open handle the no-op case.
