---
id: "{{taskId}}"
title: "Push branch and open PR — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/pr-open/pr.json"
checks:
  - id: pr-result-recorded
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.outcome != null' {{artifactsRel}}/pr-open/pr.json"
    description: PR outcome recorded
  - id: rfc-status-updated-when-pr-opened
    cmd: "node .converge/playbooks/rfc-shipping/scripts/check-rfc-status-flipped.mjs {{artifactsRel}}/pr-open/pr.json {{artifactsRel}}/pick/selected-rfc.json {{projectDir}}"
    description: When PR opened, RFC status is implementing or implementing-needs-human
  - id: pr-url-when-opened
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e 'if .outcome == \"opened\" then .url != null else true end' {{artifactsRel}}/pr-open/pr.json"
    description: When PR is opened, the URL is recorded
---

# Push branch and open PR

Read inputs:
- `{{artifactsRel}}/pick/selected-rfc.json` — RFCs being shipped
- `{{artifactsRel}}/branch/branch.json` — branch name
- `{{artifactsRel}}/test/test-result.json` — test outcome

## Branching by outcome

### `outcome: pass`

```sh
cd {{projectDir}}
BRANCH=$(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.branch_name' {{artifactsRel}}/branch/branch.json)
RFC_NUM=$(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.rfcs[0].number' {{artifactsRel}}/pick/selected-rfc.json)
RFC_TITLE=$(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.rfcs[0].title' {{artifactsRel}}/pick/selected-rfc.json)

# Stage RFC implementation changes (NOT the RFC frontmatter flip — that's a separate commit)
git add .
git commit -m "feat: $RFC_TITLE (RFC #$RFC_NUM)

Implements RFC #$RFC_NUM. See docs/rfcs/$RFC_NUM-*.md for the full spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push -u origin "$BRANCH"

# Flip RFC status: accepted → implementing
node .converge/playbooks/rfc-shipping/scripts/update-rfc-status.mjs \
  --rfc {{projectDir}}/$(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.rfcs[0].path' {{artifactsRel}}/pick/selected-rfc.json) \
  --status implementing

# Open PR
PR_URL=$(gh pr create \
  --title "feat: $RFC_TITLE (RFC #$RFC_NUM)" \
  --body "$(cat <<EOF
## Summary
Implements RFC #$RFC_NUM.

See \`docs/rfcs/$RFC_NUM-*.md\` for the full proposal.

## Type
- [x] $(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.rfcs[0].type' {{artifactsRel}}/pick/selected-rfc.json)

## Testing Done
Test plan from the RFC was executed. See \`{{artifactsRel}}/test/test-result.json\` for evidence.

🤖 Generated with [Claude Code](https://claude.com/claude-code) via the rfc-shipping playbook.
EOF
)" --base main --head "$BRANCH")
```

### `outcome: fail_recoverable`

Same commit + push + `update-rfc-status.mjs --status implementing-needs-human`, but:
- PR title prefixed with `[tests-failing]`
- PR body includes a "⚠️ Tests failing — needs human" section listing the failed tests
- After creation, `gh pr edit --add-label tests-failing`

### `outcome: fail_blocked`

Do NOT open a PR. Do NOT commit. Reset working tree:

```sh
cd {{projectDir}}
git reset --hard origin/main
```

The branch is preserved on the local machine for human inspection. The RFC
status reverts (no flip — it stays `accepted`).

### `outcome: skipped` (from implement short-circuit)

Same as `fail_blocked` — no PR, no commit, branch preserved if it has any
work, otherwise deleted.

## High-risk gating

If the RFC has `risk: high`, append a section to the PR body:

```markdown
## ⚠️ High-risk change

This PR touches load-bearing framework code. Add label `framework-core-ok`
after human review confirms the change is safe.

- [ ] `framework-core-ok` label applied by human reviewer
```

## Output

Write `{{artifactsRel}}/pr-open/pr.json`:

```json
{
  "outcome": "opened" | "blocked-no-pr" | "skipped",
  "url": "https://github.com/.../pull/123",
  "number": 123,
  "branch": "rfc/0023-ab12cd34",
  "test_outcome": "pass",
  "rfc_status_after": "implementing"
}
```
