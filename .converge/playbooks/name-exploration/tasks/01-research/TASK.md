---
id: 01-research
title: Brand Strategy Brief for Naming
description: Build the creative brief, positioning, naming territories, criteria, and forbidden zones for a serious product naming sprint.
inputs:
  - README.md
  - package.json
  - artifacts/name-exploration/taste-calibration.md
  - artifacts/name-exploration/taste-principles.json
  - artifacts/name-exploration/competitive-map.json
  - artifacts/name-exploration/white-space-map.md
outputs:
  - artifacts/name-exploration/identity.md
  - artifacts/name-exploration/criteria.json
  - artifacts/name-exploration/creative-brief.md
  - artifacts/name-exploration/forbidden-zones.json
checks:
  - id: identity-exists
    cmd: test -s artifacts/name-exploration/identity.md
    description: Identity document exists and is non-empty
  - id: creative-brief-exists
    cmd: test -s artifacts/name-exploration/creative-brief.md
    description: Creative brief exists
  - id: criteria-valid-json
    cmd: jq empty artifacts/name-exploration/criteria.json
    description: Criteria is valid JSON
  - id: criteria-has-dimensions
    cmd: jq -e '.dimensions | length >= 6' artifacts/name-exploration/criteria.json
    description: Criteria has agency-grade dimensions
  - id: forbidden-valid-json
    cmd: jq empty artifacts/name-exploration/forbidden-zones.json
    description: Forbidden zones are valid JSON
---

# Research: Brand Strategy Brief for Naming

Read `README.md`, `package.json`, the taste calibration artifacts, the competitive map, and any obvious docs that explain the product. Produce a naming brief good enough for a premium creative agency.

## Write `identity.md`

Cover product truth, audience, emotional promise, differentiators, and naming constraints. Be opinionated: this product turns chaotic one-off AI chats into repeatable, verifiable, DAG-based work.

## Write `creative-brief.md`

Use this structure:

```md
# Creative Brief

## Product Truth
## Strategic Positioning
## Audience and Buying Context
## Emotional Territory
## Naming Principles
## Must Avoid
## Naming Territories to Explore
## What a Winning Name Feels Like
```

## Write `criteria.json`

Weights must sum to 1.0. Use these dimensions:

```json
{
  "dimensions": [
    { "id": "distinctiveness", "label": "Distinctiveness", "weight": 0.20, "description": "Ownable and not confused with existing AI/dev tools." },
    { "id": "memorability", "label": "Memorability", "weight": 0.18, "description": "Easy to say, spell, remember, and recommend aloud." },
    { "id": "product-truth", "label": "Product Truth", "weight": 0.18, "description": "Connects to verifiable agent execution, DAGs, playbooks, convergence, or checks." },
    { "id": "brand-energy", "label": "Brand Energy", "weight": 0.16, "description": "Has emotional charge, confidence, and launch-worthy presence." },
    { "id": "ownability", "label": "Ownability", "weight": 0.14, "description": "Searchable, not generic, plausible domain/social/trademark path." },
    { "id": "developer-fit", "label": "Developer Fit", "weight": 0.14, "description": "Feels good as a CLI, npm scope, GitHub org, and technical conversation." }
  ],
  "constraints": {
    "max_length": 15,
    "prefer_length": "4-10",
    "must_work_as_cli_binary": true,
    "must_work_as_npm_scope": true,
    "no_slurs_or_offensive": true,
    "avoid_generic_ai_terms": ["agent", "ai", "lang", "chain", "crew", "auto"]
  }
}
```

## Write `forbidden-zones.json`

Include copied example names, crowded AI naming patterns, too-literal names, existing well-known developer tools, and words with poor CLI ergonomics.
