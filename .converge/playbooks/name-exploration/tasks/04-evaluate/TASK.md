---
id: 04-evaluate
title: Agency Scorecard Evaluation
description: Score available names against the agency rubric from criteria.json.
inputs:
  - artifacts/name-exploration/validated-candidates.json
  - artifacts/name-exploration/collision-checked-candidates.json
  - artifacts/name-exploration/criteria.json
  - artifacts/name-exploration/taste-principles.json
outputs:
  - artifacts/name-exploration/evaluated-candidates.json
checks:
  - id: evaluated-exists
    cmd: test -f artifacts/name-exploration/evaluated-candidates.json
    description: Evaluated candidates file exists
  - id: valid-json
    cmd: jq empty artifacts/name-exploration/evaluated-candidates.json
    description: Valid JSON
  - id: all-available-have-scores
    cmd: jq -e '[.[] | select(.available == true)] | all(has("scores") and has("weighted_total"))' artifacts/name-exploration/evaluated-candidates.json
    description: All available candidates have scores
---

# Evaluate: Agency Scorecard

Run:

```sh
node .converge/playbooks/name-exploration/scripts/evaluate-candidates.cjs
```

Then review the top 30 manually as a creative director. Penalize collision risk, generic AI/workflow terms, random SaaS coinage, hard pronunciation, and names that require too much explanation. Preserve the JSON schema and create a meaningful score spread; not every good name can be a 5.
