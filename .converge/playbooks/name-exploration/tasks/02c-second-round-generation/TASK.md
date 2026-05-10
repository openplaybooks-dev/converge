---
id: 02c-second-round-generation
title: Second-Round Deep Creative Exploration
description: Generate a deeper, more original second-round naming pool from the strongest spaces found by critique.
inputs:
  - artifacts/name-exploration/critique-survivors.json
  - artifacts/name-exploration/rejected-candidates.json
  - artifacts/name-exploration/second-round-brief.json
  - artifacts/name-exploration/taste-principles.json
  - artifacts/name-exploration/white-space-map.md
outputs:
  - artifacts/name-exploration/second-round-raw.json
  - artifacts/name-exploration/second-round-candidates.json
checks:
  - id: raw-valid
    cmd: jq empty artifacts/name-exploration/second-round-raw.json
    description: Second-round raw JSON is valid
  - id: raw-min-120
    cmd: jq -e 'length >= 120' artifacts/name-exploration/second-round-raw.json
    description: Second round generated at least 120 raw ideas
  - id: candidates-valid
    cmd: jq empty artifacts/name-exploration/second-round-candidates.json
    description: Second-round candidates JSON is valid
  - id: candidate-count
    cmd: jq -e 'length >= 25 and length <= 45' artifacts/name-exploration/second-round-candidates.json
    description: Second round shortlist has 25-45 candidates
  - id: agency-schema-and-quality
    cmd: node .converge/playbooks/name-exploration/scripts/check-name-candidates.cjs artifacts/name-exploration/second-round-candidates.json second-round
    description: Second-round candidates pass schema and quality gates
---

# Second-Round Deep Creative Exploration

Use the critique to go deeper, not broader in the same obvious way.

Generate at least 120 new raw ideas. Do not repeat any first-round names, rejected names, prompt examples, or close variants. Push into different spaces:

- strange-but-usable craft terms;
- publishing/proofing language;
- navigation instruments and bearings;
- music structure, counterpoint, tempo, notation;
- mathematical convergence, fixed points, limits, lattices;
- ecological network and root systems;
- verification marks, receipts, ledgers, traces;
- calm-control words that feel confident, not bureaucratic;
- coined names with real etymological pressure, not random vowels.

Select 25-45 final candidates. Every final candidate must use the standard schema with `strategy_source: "second-round"`. Add richer rationale if useful, but preserve the required fields.
