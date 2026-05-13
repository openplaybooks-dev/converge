---
id: "{{taskId}}"
depends_on:
  - "{{testTaskId}}"
title: "Implement correction — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/analyze/correction-spec.json"
  - "{{artifactsRel}}/test/test-result.json"
outputs:
  - "{{artifactsRel}}/implement/patch-manifest.json"
checks:
  - id: patch-manifest-generated
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/generate-patch-manifest.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json {{artifactsRel}}/analyze/correction-spec.json"
    description: Patch manifest regenerated from actual git diff
  - id: patch-manifest-valid
    cmd: "jq empty {{artifactsRel}}/implement/patch-manifest.json"
    description: Patch manifest JSON is valid
  - id: test-file-included
    cmd: "jq -e --arg f \"$(jq -r '.test_file' {{artifactsRel}}/analyze/correction-spec.json)\" '.files_changed | index($f) != null' {{artifactsRel}}/implement/patch-manifest.json"
    description: The test file is in the changed files
  - id: framework-file-included
    cmd: "jq -e --arg f \"$(jq -r '.files_to_change[0]' {{artifactsRel}}/analyze/correction-spec.json)\" '.files_changed | index($f) != null' {{artifactsRel}}/implement/patch-manifest.json"
    description: The framework file is in the changed files
  - id: diff-bounded
    cmd: 'changed=$(git -C {{projectDir}} diff --name-only -- . '':!.converge/artifacts/self-improvement-loop/**'' '':!.converge/journal/self-improvement-loop/**'' '':!.converge/playbooks/self-improvement-loop/**'' | wc -l | tr -d '' ''); test "$changed" -le 2'
    description: Max 2 files changed (1 test + 1 framework file)
  - id: no-self-modification
    cmd: '! git -C {{projectDir}} diff --name-only -- .converge/playbooks/self-improvement-loop/ | grep -q .'
    description: Zero changes to self-improvement playbook
  - id: no-dist-edits
    cmd: '! git -C {{projectDir}} diff --name-only -- ''*/dist/*'' | grep -q .'
    description: No generated dist files edited
  - id: no-ts-escape-hatches
    cmd: '! git -C {{projectDir}} diff -U0 -- ''*.ts'' ''*.tsx'' | grep -E ''^\+.*(@ts-ignore|as any)'''
    description: No new TypeScript suppressions or as-any casts
  - id: no-secrets
    cmd: '! git -C {{projectDir}} diff -U0 | grep -E ''^\+.*(sk-[A-Za-z0-9_-]{16,}|api[_-]?key|auth[_-]?token)'''
    description: No credential-looking additions
---

# Implement the correction

## ⛔ ORDER MATTERS: Code must make the existing test pass

1. **Read the test file** from `correction-spec.json` — it already exists and FAILS
2. **Implement the minimal code change** — exactly one file in `packages/`
3. **Run the test — confirm it PASSES**
4. **Run the full build** — `pnpm --filter @converge/cli build && pnpm --filter @converge/core build`

Do NOT modify the test file. Do NOT weaken the test. The test IS the specification.

## Breaking changes

This project is under active development. Aggressive changes that improve
correctness are acceptable. When removing or changing APIs:
- Prefer `console.warn()` deprecation over `throw new Error()` so existing
  consumers get a migration path rather than a hard crash
- Ensure the test coverage proves the new behavior is correct
- Breaking changes that fix real bugs are better than preserving broken APIs

## ⛔ SELF-MODIFICATION BLOCKED

You are FORBIDDEN from editing files under:
- `.converge/playbooks/self-improvement-loop/`
- `.converge/journal/self-improvement-loop/`
- `.converge/artifacts/self-improvement-loop/`

## Rules

- Touch only the files listed in `correction-spec.json`
- The test must encode the CORRECT mental model — it should pass when the framework
  behavior matches the design principle, fail when it doesn't
- Do NOT weaken existing tests, checks, types, or runtime validation
- Do NOT use `any`, `as any`, `@ts-ignore`
- Do NOT edit generated `dist/` files
- If the change requires touching more files than planned, STOP and update the spec

## After implementation

Regenerate the patch manifest from git diff:
```sh
node .converge/playbooks/self-improvement-loop/scripts/generate-patch-manifest.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json {{artifactsRel}}/analyze/correction-spec.json
```

## Patch manifest format

```json
{
  "epoch": "{{epoch}}",
  "mental_model": "Checks, Not Vibes",
  "finding_id": "weak-checks-only-check-existence",
  "files_changed": ["tests/playbook-output-validation.test.ts", "packages/core/src/task/unit/find-gaps.ts"],
  "test_written_first": true,
  "test_failed_before_fix": true,
  "test_passed_after_fix": true,
  "change_summary": "Added content validation to output checks so checks verify file content, not just file existence",
  "commands_to_verify": [
    "pnpm --filter @converge/cli build",
    "pnpm --filter @converge/core build",
    "pnpm vitest run tests/playbook-output-validation.test.ts"
  ]
}
```
