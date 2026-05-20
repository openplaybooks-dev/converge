---
id: "{{taskId}}"
title: "Pick next Accepted RFC — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/pick/selected-rfc.json"
checks:
  - id: selected-rfc-recorded
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.outcome != null' {{artifactsRel}}/pick/selected-rfc.json"
    description: Selection outcome recorded
  - id: rfc-path-exists-when-picked
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e 'if .outcome == \"picked\" or .outcome == \"chore-batch\" then .rfcs != null else true end' {{artifactsRel}}/pick/selected-rfc.json"
    description: When picked, RFCs are named
---

# Pick next Accepted RFC

Sort Accepted RFCs deterministically and pick the first that has no in-flight
branch.

## Script

```sh
node {{projectDir}}/.converge/playbooks/rfc-shipping/scripts/pick-accepted-rfc.mjs \
  --rfcs-dir {{projectDir}}/docs/rfcs \
  --project-dir {{projectDir}} \
  --out {{artifactsRel}}/pick/selected-rfc.json
```

The script:
1. Lists `docs/rfcs/[0-9]*-*.md` with `status: accepted` in frontmatter.
2. Filters out any RFC with an existing branch matching `rfc/NNNN-*`
   (checked via `git branch --list 'rfc/*'` and `git ls-remote --heads origin 'rfc/*'`).
3. Sorts by `(priority_tier, estimate, accepted_at)`.
4. If the top RFC is `type: chore`, collects up to 5 consecutive chore RFCs
   into a batch (subject to <50 LOC ceiling, no high-risk files — these are
   verified later during implement, but the batch is proposed here).
5. Writes:

```json
{
  "outcome": "picked" | "chore-batch" | "none-available",
  "rfcs": [
    {
      "number": "0023",
      "slug": "ab12cd34",
      "path": "docs/rfcs/0023-ab12cd34.md",
      "title": "...",
      "type": "fix",
      "priority_tier": "tier1",
      "estimate": "1 day",
      "risk": "low",
      "accepted_at": "2026-05-20T..."
    }
  ],
  "branch_name": "rfc/0023-ab12cd34" | "rfc/chore-batch-<unix>",
  "deterministic_hash": "<sha1 of sorted RFC numbers>"
}
```

If `outcome == "none-available"`, downstream tasks short-circuit cleanly.
