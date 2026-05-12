---
id: "{{taskId}}"
depends_on:
  - "{{selectTaskId}}"
title: "Implement selected improvement — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/analyze/improvement-spec.json"
outputs:
  - "{{artifactsRel}}/implement/patch-manifest.json"
checks:
  - id: patch-manifest-generated
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/generate-patch-manifest.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json {{artifactsRel}}/analyze/improvement-spec.json"
    description: Patch manifest is regenerated from the actual non-artifact git diff
  - id: patch-manifest-valid
    cmd: "jq empty {{artifactsRel}}/implement/patch-manifest.json"
    description: Patch manifest JSON is valid
  - id: patch-manifest-has-files
    cmd: "jq -e '.files_changed | length >= 1' {{artifactsRel}}/implement/patch-manifest.json"
    description: Patch manifest records changed files
  - id: patch-manifest-matches-diff
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-patch-manifest.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json"
    description: Patch manifest matches non-artifact git diff
  - id: diff-budget
    cmd: 'changed=$(git -C {{projectDir}} diff --name-only -- . '':!.converge/artifacts/self-improvement-loop/**'' '':!.converge/journal/self-improvement-loop/**'' | wc -l | tr -d '' ''); test "$changed" -le 7'
    description: Source/test diff is bounded for one epoch
  - id: files-are-valid-paths
    cmd: 'jq -e ''[.files_changed[] | select(test("^[a-zA-Z0-9._/-]+$") | not)] | length == 0'' {{artifactsRel}}/implement/patch-manifest.json'
    description: All files_changed entries look like real file paths
  - id: changed-files-allowed
    cmd: 'jq -r ''.files_changed[]'' {{artifactsRel}}/implement/patch-manifest.json | sed ''s/\r$//'' | while IFS= read -r f; do jq -e --arg f "$f" ''.selected.files | index($f) != null'' {{artifactsRel}}/analyze/improvement-spec.json >/dev/null || exit 1; done'
    description: Patch manifest files are listed in selected spec
  - id: no-generated-dist-edits
    cmd: '! git -C {{projectDir}} diff --name-only -- ''*/dist/*'' | grep -q .'
    description: Generated dist files are not edited
  - id: no-ts-suppressions
    cmd: '! git -C {{projectDir}} diff -U0 -- ''*.ts'' ''*.tsx'' | grep -E ''^\+.*(@ts-ignore|as any)'''
    description: No new TypeScript suppressions or as-any casts
  - id: no-secret-looking-additions
    cmd: '! git -C {{projectDir}} diff -U0 | grep -E ''^\+.*(sk-[A-Za-z0-9_-]{16,}|api[_-]?key|auth[_-]?token)'''
    description: No credential-looking additions
---

# Implement selected improvement

Read `{{artifactsRel}}/analyze/improvement-spec.json` and implement only the
selected contract. This is a maintainer patch, not a brainstorming session.

## Rules

- Touch only files listed in `selected.files`; if another file is required, update the spec first or stop.
- If coverage is missing, write or strengthen the regression under `/tests` first.
- Keep the change minimal and production-oriented.
- Prefer framework/API correctness over local hacks.
- Do not weaken tests, checks, types, lint, or runtime validation.
- Do not use `any`, `as any`, `@ts-ignore`, broad catch-and-ignore, generated `dist/` edits, or credentials.
- Do not implement cosmetic build-warning/help-only cleanup unless the selected spec is non-cosmetic and explains why.
- If the spec is too large or unsafe, do not partially refactor. Instead write a small guard, test, or backlog refactor proposal.

## Patch manifest discipline

`files_changed` is generated from the actual non-artifact git diff by the
`patch-manifest-generated` check. Do not hand-author changed files from memory.
After implementation, run the generator before verification:

```sh
node .converge/playbooks/self-improvement-loop/scripts/generate-patch-manifest.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json {{artifactsRel}}/analyze/improvement-spec.json
```

If unrelated files appear in the generated manifest, stop and record an
isolation/escalation note instead of laundering them into the epoch.

## Output

Write `{{artifactsRel}}/implement/patch-manifest.json`:

```json
{
  "epoch": "{{epoch}}",
  "selected_id": "...",
  "files_changed": ["path"],
  "change_summary": "one sentence",
  "regression_added": true,
  "test_command": "pnpm vitest run tests/playbook-compile.test.ts",
  "commands_to_verify": [
    "pnpm --filter @converge/cli build",
    "pnpm --filter @converge/core build",
    "pnpm vitest run tests/playbook-compile.test.ts"
  ],
  "deferred_backlog_items": []
}
```
