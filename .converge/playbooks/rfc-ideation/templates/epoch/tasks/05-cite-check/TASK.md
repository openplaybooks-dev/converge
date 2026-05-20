---
id: "{{taskId}}"
title: "Verify draft citations — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/cite-check/cite-report.json"
checks:
  - id: cite-report-valid
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e '.checked != null' {{artifactsRel}}/cite-check/cite-report.json"
    description: Citation report is valid JSON
  - id: all-citations-resolve
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e '.stale_count == 0' {{artifactsRel}}/cite-check/cite-report.json"
    description: Zero stale or missing citations in the draft
---

# Verify every path:line citation in the draft

Read `{{artifactsRel}}/draft/draft.md`. If empty (triage short-circuited),
write an empty cite-report and exit:

```json
{"skipped":true,"reason":"draft-empty","checked":0,"stale_count":0,"stale":[]}
```

Otherwise, parse every `path:line` reference and verify each one exists in
the current HEAD.

## Script

```sh
node {{projectDir}}/.converge/playbooks/rfc-ideation/scripts/verify-rfc-citations.mjs \
  --draft {{artifactsRel}}/draft/draft.md \
  --project-dir {{projectDir}} \
  --tolerance 0 \
  --out {{artifactsRel}}/cite-check/cite-report.json
```

The script:

1. Reads the draft body.
2. Extracts every match of `[a-zA-Z0-9_/\.\-]+\.(ts|tsx|js|mjs|cjs|md|yml|yaml|json|sh):\d+`
   from the body.
3. For each citation `path:line`:
   - Resolves `path` relative to project root.
   - Verifies the file exists and has at least `line` lines.
   - At tolerance 0 (draft mode), no drift allowed — the line must exist.
4. Writes report:

```json
{
  "checked": 12,
  "stale_count": 0,
  "stale": [],
  "valid": [
    {"path": "packages/core/src/run/index.ts", "line": 310, "exists": true}
  ]
}
```

If any citation is stale, `stale_count > 0` and this task fails the
`all-citations-resolve` check. The framework retries — the draft step (04)
must regenerate with corrected citations.
