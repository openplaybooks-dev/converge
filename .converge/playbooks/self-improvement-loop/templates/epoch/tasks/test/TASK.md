---
id: "{{taskId}}"
depends_on:
  - "{{selectTaskId}}"
title: "Write failing test — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/mental-model/selection.json"
  - "{{artifactsRel}}/analyze/correction-spec.json"
outputs:
  - "{{artifactsRel}}/test/test-result.json"
checks:
  - id: test-file-exists
    cmd: "test -f {{projectDir}}/$(jq -r '.test_file' {{artifactsRel}}/analyze/correction-spec.json)"
    description: Test file was created
  - id: test-fails-now
    cmd: "jq -e '.test_failed_before_fix == true' {{artifactsRel}}/test/test-result.json"
    description: Test fails before code change (proves the gap exists)
  - id: test-result-valid
    cmd: "jq empty {{artifactsRel}}/test/test-result.json"
    description: Test result is valid JSON
  - id: test-encodes-mental-model
    cmd: "jq -e '.mental_model_encoded != \"\"' {{artifactsRel}}/test/test-result.json"
    description: Test result records which mental model the test encodes
  - id: no-code-changes-yet
    cmd: "jq -e '.code_changed == false' {{artifactsRel}}/test/test-result.json"
    description: No framework code was changed in this phase (test-only)
---

# Write the failing test

Read `{{artifactsRel}}/analyze/correction-spec.json`. Write the test it specifies.
Do NOT change any framework code. The test must FAIL — that proves the gap exists.

## ⛔ TEST ONLY — NO CODE CHANGES

Do not edit any file under `packages/`. Only create or modify the test file.

## What the test must do

1. Encode the CORRECT mental model behavior
2. Currently FAIL because the framework doesn't implement it correctly
3. Be runnable with `pnpm vitest run tests/<test-file>.test.ts`
4. Have clear assertion messages explaining what the correct behavior should be

## Steps

1. Create or modify the test file specified in `correction-spec.json`
2. Run the test to confirm it FAILS:
   ```sh
   cd {{projectDir}}
   pnpm vitest run $(jq -r '.test_file' {{artifactsRel}}/analyze/correction-spec.json)
   ```
3. Record the failure output

## Output

Write `{{artifactsRel}}/test/test-result.json`:
```json
{
  "epoch": "{{epoch}}",
  "mental_model_encoded": "Checks, Not Vibes",
  "test_file": "tests/playbook-output-validation.test.ts",
  "test_failed_before_fix": true,
  "failure_output": "<excerpt of test failure>",
  "code_changed": false,
  "ready_for_implement": true
}
```
