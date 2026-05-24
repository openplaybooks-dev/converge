---
id: "{{taskId}}"
title: "Create RFC branch — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/branch/branch.json"
checks:
  - id: branch-result-recorded
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.outcome != null' {{artifactsRel}}/branch/branch.json"
    description: Branch outcome recorded
  - id: branch-exists-when-created
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e 'if .outcome == \"created\" then (.branch_name != null and .head_sha != null) else true end' {{artifactsRel}}/branch/branch.json"
    description: When created, branch name and head SHA are recorded
---

# Create the RFC branch

Read `{{artifactsRel}}/pick/selected-rfc.json`. If `outcome == "none-available"`,
write `{"outcome":"skipped","reason":"no-rfc-picked"}` and exit.

Otherwise, create the branch from `main`:

```sh
cd {{projectDir}}
BRANCH=$(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.branch_name' {{artifactsRel}}/pick/selected-rfc.json)
git fetch origin main
git checkout -b "$BRANCH" origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

Write `{{artifactsRel}}/branch/branch.json`:

```json
{
  "outcome": "created",
  "branch_name": "rfc/0023-ab12cd34",
  "head_sha": "<40-char sha>",
  "base": "origin/main"
}
```

## Guardrails

- Working tree must be clean before branching. If `git status --porcelain`
  shows anything non-artifact, abort with `outcome: dirty-tree` and let the
  parent loop's `clean-nonartifact-start` check catch it on retry.
- Branch must not already exist locally or on remote. The pick task already
  filtered, but re-check here.
