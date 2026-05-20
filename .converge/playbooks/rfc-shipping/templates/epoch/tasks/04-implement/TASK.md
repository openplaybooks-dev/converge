---
id: "{{taskId}}"
title: "Apply RFC implementation steps — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/implement/patch-manifest.json"
checks:
  - id: patch-manifest-recorded
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.outcome != null' {{artifactsRel}}/implement/patch-manifest.json"
    description: Patch manifest recorded
  - id: manifest-matches-git-diff
    cmd: "node .converge/playbooks/rfc-shipping/scripts/check-manifest-matches-diff.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json"
    description: Files in patch manifest match git diff exactly
  - id: no-self-modification
    cmd: "! git -C {{projectDir}} diff --name-only | grep -E '^\\.converge/playbooks/rfc-(ideation|shipping)/' "
    description: Diff does not touch ideation or shipping playbooks
  - id: no-forbidden-patterns
    cmd: "! git -C {{projectDir}} diff -U0 | grep -E '^\\+' | grep -E '(\\bas any\\b|@ts-ignore|@ts-nocheck)' "
    description: No `as any`, `@ts-ignore`, or `@ts-nocheck` added in this diff
  - id: high-risk-files-only-when-marked
    cmd: "node .converge/playbooks/rfc-shipping/scripts/check-high-risk-marker.mjs {{projectDir}} {{artifactsRel}}/pick/selected-rfc.json"
    description: High-risk files only changed when RFC declares risk:high
---

# Apply the RFC's Implementation steps

Read the RFC body (path in `{{artifactsRel}}/pick/selected-rfc.json`).
Extract its `## Implementation steps` section. Apply each step.

## Process

1. Read the RFC body. Extract Implementation steps as an ordered list.
2. For each step, identify the files to modify and the change to make.
3. Apply changes using the Edit and Write tools (NOT shell).
4. After all steps are applied, generate the patch manifest:

```sh
cd {{projectDir}}
node .converge/playbooks/rfc-shipping/scripts/parse-impl-steps.mjs \
  --rfc {{projectDir}}/$(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.rfcs[0].path' {{artifactsRel}}/pick/selected-rfc.json) \
  --out {{artifactsRel}}/implement/impl-steps.json

git diff --name-only > {{artifactsRel}}/implement/changed-files.txt
node -e "
  const fs = require('fs');
  const files = fs.readFileSync('{{artifactsRel}}/implement/changed-files.txt', 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync('{{artifactsRel}}/implement/patch-manifest.json', JSON.stringify({
    outcome: files.length > 0 ? 'changes-applied' : 'no-changes',
    files,
    file_count: files.length
  }, null, 2));
"
```

## Guardrails

The framework will reject your changes if any of the following are true:

- The diff touches `.converge/playbooks/rfc-ideation/` or
  `.converge/playbooks/rfc-shipping/` (no self-modification).
- The diff adds `as any`, `@ts-ignore`, or `@ts-nocheck` (these are explicit
  type-safety violations).
- The diff modifies files under `dist/` (build artifacts, not source).
- High-risk files (`packages/core/src/orchestrator/spawn*.ts`,
  `packages/core/src/seed/cli-spawn.ts`) changed without the RFC declaring
  `risk: high`.

If the RFC's Implementation steps cannot be applied (e.g. cited files don't
exist anymore, conflicting design), STOP and write:

```json
{
  "outcome": "cannot-apply",
  "reason": "<specific reason>",
  "files": [],
  "file_count": 0
}
```

This fails the `manifest-matches-git-diff` check unless `files: []` AND the
git diff is also empty. In that case the check passes and the epoch
short-circuits cleanly to PR-open which records the failure.
