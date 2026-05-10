---
id: 02-generate
title: Converge Agency Naming Territories
description: Merge, dedupe, normalize, and quality-gate outputs from 10 creative naming territories.
inputs:
  - artifacts/name-exploration/identity.md
  - artifacts/name-exploration/criteria.json
  - artifacts/name-exploration/semantic-field-candidates.json
  - artifacts/name-exploration/metaphor-domains-candidates.json
  - artifacts/name-exploration/latin-greek-roots-candidates.json
  - artifacts/name-exploration/npm-pattern-study-candidates.json
  - artifacts/name-exploration/competitive-ai-candidates.json
  - artifacts/name-exploration/phonetic-aesthetics-candidates.json
  - artifacts/name-exploration/brand-blending-candidates.json
  - artifacts/name-exploration/abstract-evocative-candidates.json
  - artifacts/name-exploration/mythology-narrative-candidates.json
  - .converge/artifacts/name-exploration/science-nature-candidates.json
outputs:
  - artifacts/name-exploration/all-candidates.json
  - artifacts/name-exploration/strategy-summary.json
checks:
  - id: all-candidates-exists
    cmd: test -f artifacts/name-exploration/all-candidates.json
    description: Merged candidate pool exists
  - id: valid-json
    cmd: jq empty artifacts/name-exploration/all-candidates.json
    description: Valid JSON
  - id: min-candidates
    cmd: jq -e 'length >= 95' artifacts/name-exploration/all-candidates.json
    description: At least 95 candidates after merge
  - id: no-duplicates
    cmd: jq -e '[.[].name | ascii_downcase] | unique | length == length' artifacts/name-exploration/all-candidates.json
    description: No duplicate names ignoring case
  - id: all-have-agency-fields
    cmd: jq -e 'all(has("name") and has("rationale") and has("category") and has("strategy_source") and has("territory") and has("pronunciation") and has("why_creative") and has("risk"))' artifacts/name-exploration/all-candidates.json
    description: Every candidate has agency-grade fields
---

# Converge: Merge the Creative Studio Output

Run the deterministic merge script:

```sh
node .converge/playbooks/name-exploration/scripts/merge-candidates.cjs
```

Then inspect `artifacts/name-exploration/all-candidates.json` as a creative director:

- Remove obvious duplicates and near-duplicates if the script missed them.
- Remove names that are copied from examples or generic AI/dev-tool clichés.
- Keep the file as a flat JSON array.
- Keep `strategy-summary.json` as a separate metadata artifact.

The merged pool should contain at least 100 credible names. If fewer than 100 survive, do not pad with weak names; instead revisit the weakest strategy tasks and regenerate them.
