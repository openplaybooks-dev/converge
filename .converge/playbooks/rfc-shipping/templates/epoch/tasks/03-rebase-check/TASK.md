---
id: "{{taskId}}"
title: "Verify RFC citations on branch HEAD — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/rebase-check/citation-report.json"
checks:
  - id: citation-report-recorded
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.checked != null' {{artifactsRel}}/rebase-check/citation-report.json"
    description: Citation report recorded
  - id: zero-stale-or-stale-recorded
    cmd: "node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -e '.stale_count == 0 or .demoted == true' {{artifactsRel}}/rebase-check/citation-report.json"
    description: Either citations are clean, or the RFC was demoted to Stale
---

# Verify RFC citations are still valid

Read `{{artifactsRel}}/pick/selected-rfc.json`. If chore-batch, skip — write
`{"skipped":true,"reason":"chore-batch","checked":0,"stale_count":0}`.

Otherwise, for each RFC in the pick list, verify every `path:line` citation
in the RFC body against the freshly branched HEAD.

## Tolerance

Tolerance is ±20 lines. The RFC's `accepted_at` may be days or weeks before
the current branch HEAD, so some drift is acceptable; large drift means the
RFC is stale.

## Script

```sh
RFC_PATH=$(node .converge/playbooks/rfc-shipping/scripts/jq-safe.mjs -r '.rfcs[0].path' {{artifactsRel}}/pick/selected-rfc.json)

node {{projectDir}}/.converge/playbooks/rfc-ideation/scripts/verify-rfc-citations.mjs \
  --draft {{projectDir}}/$RFC_PATH \
  --project-dir {{projectDir}} \
  --tolerance 20 \
  --out {{artifactsRel}}/rebase-check/citation-report.json
```

## Stale path

If `stale_count > 0`, demote the RFC to `Status: Stale`:

```sh
node {{projectDir}}/.converge/playbooks/rfc-shipping/scripts/demote-stale-rfc.mjs \
  --rfc {{projectDir}}/$RFC_PATH \
  --report {{artifactsRel}}/rebase-check/citation-report.json \
  --backlog {{projectDir}}/.converge/artifacts/rfc-ideation/backlog.jsonl
```

Then update `citation-report.json` with `demoted: true` and fail this epoch
cleanly. The ideation playbook's next epoch may pick up the demoted RFC
from the backlog.

Note: demoting modifies `docs/rfcs/NNNN-*.md`, which violates the
"no-self-modification" check IF the file is under playbook dirs. RFC files
are under `docs/rfcs/`, which is not a playbook dir — so this is allowed.
