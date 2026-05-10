---
id: 04b-narrative-test
title: Narrative and Product-Copy Stress Test
description: Test top names in real product sentences, CLI usage, and founder positioning.
inputs:
  - artifacts/name-exploration/evaluated-candidates.json
  - artifacts/name-exploration/collision-checked-candidates.json
  - artifacts/name-exploration/identity.md
  - artifacts/name-exploration/creative-brief.md
outputs:
  - artifacts/name-exploration/narrative-tested-candidates.json
  - artifacts/name-exploration/narrative-test-report.md
checks:
  - id: narrative-valid
    cmd: jq empty artifacts/name-exploration/narrative-tested-candidates.json
    description: Narrative-tested JSON is valid
  - id: top20-tested
    cmd: jq -e 'length >= 20' artifacts/name-exploration/narrative-tested-candidates.json
    description: At least top 20 names tested
  - id: all-have-copy
    cmd: jq -e 'all(has("homepage_headline") and has("cli_sentence") and has("founder_pitch") and has("community_announcement") and has("narrative_verdict"))' artifacts/name-exploration/narrative-tested-candidates.json
    description: Every tested name has copy stress-test fields
  - id: report-exists
    cmd: test -s artifacts/name-exploration/narrative-test-report.md
    description: Narrative test report exists
---

# Narrative and Product-Copy Stress Test

Take the top available evaluated names, especially those with low/medium collision risk, and test whether they work in real copy.

For at least 20 names, add:

- `one_liner`
- `homepage_headline`
- `cli_sentence`
- `founder_pitch`
- `community_announcement`
- `rename_story`
- `narrative_verdict`: `works|mixed|fails`
- `verdict_reason`

Names that only look good in a spreadsheet but fail in real sentences should be downgraded in the final report.
