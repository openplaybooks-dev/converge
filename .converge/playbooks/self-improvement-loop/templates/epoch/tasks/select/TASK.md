---
id: "{{taskId}}"
depends_on:
  - "{{observeTaskId}}"
title: "Select correction — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/observe/findings.json"
  - "{{artifactsRel}}/observe/report.md"
outputs:
  - "{{artifactsRel}}/analyze/correction-spec.json"
  - "{{artifactsRel}}/analyze/report.md"
checks:
  - id: spec-valid
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs empty {{artifactsRel}}/analyze/correction-spec.json"
    description: Correction spec JSON is valid
  - id: test-first
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e '.test_file != \"\" and .test_description != \"\"' {{artifactsRel}}/analyze/correction-spec.json"
    description: Spec defines the test to write first
  - id: one-change
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e '(.files_to_change | length == 1) and (.files_to_change[0] | startswith(\"packages/\"))' {{artifactsRel}}/analyze/correction-spec.json"
    description: Exactly one framework file to change
  - id: selected-from-finding
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e --slurpfile findings {{artifactsRel}}/observe/findings.json '.finding_id as $fid | $findings[0].findings | any(.id == $fid)' {{artifactsRel}}/analyze/correction-spec.json"
    description: Selected finding comes from observe phase
  - id: not-escalated
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-escalated-target.mjs {{artifactsRel}}/analyze/correction-spec.json {{artifactsRootRel}}/escalated.json 2>/dev/null || test ! -f {{artifactsRootRel}}/escalated.json"
    description: Selected finding is not escalated
  - id: mental-model-not-recent
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-selection-quality.mjs {{artifactsRel}}/analyze/correction-spec.json {{artifactsRootRel}}/metrics.jsonl {{artifactsRootRel}}/touched-files.jsonl"
    description: Mental model was not audited in the last 2 epochs
  - id: report-written
    cmd: "test -s {{artifactsRel}}/analyze/report.md"
    description: Selection rationale exists
---

# Select one correction

Read `{{artifactsRel}}/observe/findings.json`. Pick the ONE finding whose correction
has the highest leverage: the change that makes future violations of this mental
model impossible or obviously wrong.

## Selection rubric (highest first)

1. **Correctness** — the framework produces wrong results under this violation
2. **Prevention** — fixing this makes an entire class of bugs impossible
3. **Determinism** — the violation causes non-deterministic behavior
4. **Clarity** — the violation obscures the framework's contract, causing downstream bugs
5. **DX** — only if no correctness/prevention/determinism/clarity findings exist

## Anti-repeat

- Check `{{artifactsRootRel}}/metrics.jsonl` — if the same mental_model was audited
  in either of the last 2 epochs, REJECT all findings from that model (it was already
  addressed or escalated)
- Check `{{artifactsRootRel}}/touched-files.jsonl` — if the target file appears in
  3+ epochs, propose a root-cause refactor instead
- Check `{{artifactsRootRel}}/escalated.json` — if the finding matches an escalated
  entry, REJECT it

## ⛔ SELF-MODIFICATION BLOCKED

Do NOT select findings that target `.converge/playbooks/self-improvement-loop/`.
The playbook is immutable during execution.

## ⛔ BREAKING CHANGES REQUIRE DEPRECATION FIRST

If the correction removes, disables, or renames a public API, exported function,
check type, or configuration field:
- **Risk MUST be `"high"`** — breaking changes are always high risk
- **Deprecation epoch first** — the first epoch adds a deprecation warning;
  a later epoch can remove after confirming no consumers break
- **`migration_plan` required** — document how existing users migrate
- **Never throw** — use `console.warn()` for deprecation, not `throw new Error()`

If the correction only changes internal implementation without affecting the
public contract, risk can be `"low"` or `"medium"`.

## Correction design

For the selected finding, design:

1. **Test first** — what test file to create or modify, what it asserts, why it
   encodes the correct mental model
2. **Minimal code change** — exactly one file in `packages/`, the smallest diff
   that makes the test pass
3. **Why this correction** — why this specific change has higher leverage than
   the alternatives

## Output

Write `{{artifactsRel}}/analyze/correction-spec.json`:
```json
{
  "epoch": "{{epoch}}",
  "mental_model": "Checks, Not Vibes",
  "finding_id": "weak-checks-only-check-existence",
  "test_file": "tests/playbook-output-validation.test.ts",
  "test_description": "Verify that a task producing empty output fails a content-aware check, proving checks validate content not just existence",
  "test_assertions": [
    "Task with empty output file fails content check",
    "Task with valid output file passes content check",
    "Content check supports jq schema validation"
  ],
  "files_to_change": ["packages/core/src/task/unit/find-gaps.ts"],
  "change_description": "Add optional content validation to check definitions so checks can verify file content (jq schema, grep pattern, line count), not just file existence",
  "why_this_correction": "Fixing output validation to check content prevents an entire class of 'task claims done but produces garbage' bugs. Currently ~60% of checks are test -s (existence-only). This change makes the Checks Not Vibes model enforceable.",
  "acceptance_checks": [
    "pnpm --filter @openplaybooks/converge build",
    "pnpm --filter @openplaybooks/converge-core build",
    "pnpm vitest run tests/playbook-output-validation.test.ts"
  ],
  "risk": "low",
  "rollback": "git revert the commit"
}
```

Write `{{artifactsRel}}/analyze/report.md` explaining why this finding was chosen
over the alternatives (list each rejected finding and the reason).
