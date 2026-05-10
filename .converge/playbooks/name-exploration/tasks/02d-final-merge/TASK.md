---
id: 02d-final-merge
title: Final Merge After Second-Round Exploration
description: Merge first-round candidates, critique survivors, and second-round candidates into a final screened candidate pool.
inputs:
  - artifacts/name-exploration/all-candidates.json
  - artifacts/name-exploration/critique-survivors.json
  - artifacts/name-exploration/second-round-candidates.json
outputs:
  - artifacts/name-exploration/final-candidates.json
  - artifacts/name-exploration/final-merge-summary.json
checks:
  - id: final-valid
    cmd: jq empty artifacts/name-exploration/final-candidates.json
    description: Final candidate JSON is valid
  - id: final-count
    cmd: jq -e 'length >= 60 and length <= 130' artifacts/name-exploration/final-candidates.json
    description: Final pool is deep but selective
  - id: no-duplicates
    cmd: jq -e '[.[].name | ascii_downcase] | unique | length == length' artifacts/name-exploration/final-candidates.json
    description: No duplicate names ignoring case
  - id: summary-valid
    cmd: jq empty artifacts/name-exploration/final-merge-summary.json
    description: Final merge summary is valid
---

# Final Merge

Create `final-candidates.json` by combining:

- all `critique-survivors.json`;
- all `second-round-candidates.json`;
- only exceptional first-round names that were not in survivors, if they deserve rescue.

Deduplicate case-insensitively. Prefer sharper second-round names over weaker first-round variants. Keep 60-130 names. Preserve all candidate fields. Add `round: "first"`, `round: "survivor"`, or `round: "second"` where possible.

Write `final-merge-summary.json` with counts by round and strategy source.

Important: after writing `final-candidates.json`, copy it to `all-candidates.json` so the existing npm validation task validates the final pool:

```sh
cp artifacts/name-exploration/final-candidates.json artifacts/name-exploration/all-candidates.json
```
