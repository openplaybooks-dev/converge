---
id: 02b-creative-critique
title: Creative Director Critique and Kill Pass
description: Ruthlessly critique the merged pool, reject weak names, and identify the strongest spaces for deeper exploration.
inputs:
  - artifacts/name-exploration/all-candidates.json
  - artifacts/name-exploration/strategy-summary.json
  - artifacts/name-exploration/taste-principles.json
  - artifacts/name-exploration/competitive-map.json
outputs:
  - artifacts/name-exploration/critique-report.md
  - artifacts/name-exploration/critique-survivors.json
  - artifacts/name-exploration/rejected-candidates.json
  - artifacts/name-exploration/second-round-brief.json
checks:
  - id: critique-report-exists
    cmd: test -s artifacts/name-exploration/critique-report.md
    description: Critique report exists
  - id: survivors-valid
    cmd: jq empty artifacts/name-exploration/critique-survivors.json
    description: Survivors JSON is valid
  - id: rejected-valid
    cmd: jq empty artifacts/name-exploration/rejected-candidates.json
    description: Rejected JSON is valid
  - id: survivor-count
    cmd: jq -e 'length >= 5 and length <= 80' artifacts/name-exploration/critique-survivors.json
    description: Critique leaves a selective survivor pool
  - id: rejected-count
    cmd: jq -e 'length >= 3' artifacts/name-exploration/rejected-candidates.json
    description: At least 3 names were rejected with reasons
  - id: second-round-brief-valid
    cmd: jq -e '.focus_territories | length >= 4' artifacts/name-exploration/second-round-brief.json
    description: Second-round brief has at least four focus territories
---

# Creative Director Critique and Kill Pass

Act like a senior naming partner, not a validator. Read the merged pool and kill names that are merely acceptable.

Reject names that:

- sound like generic AI, orchestration, workflow, or task-runner tooling;
- are available only because nobody would want them;
- require too much explanation;
- are hard to say, spell, or recommend aloud;
- feel like random SaaS coinage;
- are too literal, too cute, too enterprise, or too library-like;
- collide with crowded zones in `competitive-map.json`.

Write:

1. `critique-survivors.json`: 25-80 strongest names, each preserving original fields and adding:
   - `critique_score` from 1-10;
   - `survival_reason`;
   - `best_use`: `company`, `cli`, `package`, or `fallback`;
   - `improve_direction`.
2. `rejected-candidates.json`: rejected names with `name`, `rejection_reason`, and `rejection_category`.
3. `second-round-brief.json`: focus territories, winning phonetic shapes, words/morphemes to explore, words/morphemes to avoid, and explicit creative prompts for round two.
4. `critique-report.md`: direct, honest memo on what is working, what is weak, and where to go deeper.
