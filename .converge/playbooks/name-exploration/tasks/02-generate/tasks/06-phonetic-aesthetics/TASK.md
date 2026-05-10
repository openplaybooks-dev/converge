---
id: 06-phonetic-aesthetics
title: Sound-First Naming
description: "Agency-grade naming territory: Generate by phonetic shape and mouthfeel. The old example names are forbidden. Explore crisp monosyllables, elegant two-syllable words, technical consonant energy, and names that sound good as a CLI command."
tags: [strategy-child, creative-agency]
inputs:
  - artifacts/name-exploration/identity.md
  - artifacts/name-exploration/criteria.json
  - artifacts/name-exploration/taste-calibration.md
  - artifacts/name-exploration/taste-principles.json
  - artifacts/name-exploration/competitive-map.json
  - artifacts/name-exploration/white-space-map.md
outputs:
  - artifacts/name-exploration/phonetic-aesthetics-raw.json
  - artifacts/name-exploration/phonetic-aesthetics-candidates.json
checks:
  - id: raw-exists
    cmd: test -f artifacts/name-exploration/phonetic-aesthetics-raw.json
    description: Raw idea pool exists
  - id: raw-min-75
    cmd: jq -e 'length >= 75' artifacts/name-exploration/phonetic-aesthetics-raw.json
    description: Raw idea pool has at least 75 ideas
  - id: final-exists
    cmd: test -f artifacts/name-exploration/phonetic-aesthetics-candidates.json
    description: Final candidates exist
  - id: valid-json
    cmd: jq empty artifacts/name-exploration/phonetic-aesthetics-raw.json && jq empty artifacts/name-exploration/phonetic-aesthetics-candidates.json
    description: Raw and final outputs are valid JSON
  - id: final-count
    cmd: jq -e 'length >= 12 and length <= 20' artifacts/name-exploration/phonetic-aesthetics-candidates.json
    description: Final candidate count is agency-shortlist sized
  - id: agency-schema-and-quality
    cmd: node .converge/playbooks/name-exploration/scripts/check-name-candidates.cjs artifacts/name-exploration/phonetic-aesthetics-candidates.json phonetic-aesthetics
    description: Candidates pass schema, no-copy, and basic quality gates
---

# Sound-First Naming

## Territory Brief

Generate by phonetic shape and mouthfeel. The old example names are forbidden. Explore crisp monosyllables, elegant two-syllable words, technical consonant energy, and names that sound good as a CLI command.


## Million-Dollar Agency Rules

You are not filling a list. You are acting as a senior naming director at a premium creative agency.

### Creative bar

A final name should feel like it could stand near Vite, Linear, Stripe, Prisma, Temporal, Dagster, Vercel, Svelte, Bun, or Raycast: simple, ownable, memorable, and technically credible.

### Forbidden output

Do NOT output examples from this or earlier prompts, close variants, plural forms, vowel swaps, or obvious derivatives. Specifically forbidden: klex, tarn, prox, gant, cliv, drex, starn, flint, crux, thresh, avelo, imara, eluno, orina, ameli, uvano, erilo, aleno, prisma, deno, verceli, lucida, vorta, nexa, sona, vigo, strika, strv, nxd, vlnt, crnx, drvn, prlx, sklp, thnk.

Also avoid generic/literal names: AgentFlow, AutoTask, TaskForge, DagRun, CheckFlow, Lang*, Chain*, Crew*, *AI unless there is an extraordinary reason.

### Depth mandate

Explore beyond the obvious. For every safe idea, push into stranger adjacent spaces: craft, proof, ritual, navigation, publishing, music, mathematics, ecology, systems, and developer primitives. Keep the final list usable, but make the raw pool daring.

### Required process

1. Read `identity.md`, `criteria.json`, `taste-calibration.md`, `taste-principles.json`, `competitive-map.json`, and `white-space-map.md`.
2. Generate at least 75 raw ideas for this territory, across genuinely different semantic spaces, not small variations.
3. Cluster raw ideas into at least 7 sub-territories, including at least two unexpected spaces from the white-space map.
4. Ruthlessly reject weak, generic, copied, or hard-to-say names.
5. Select 12-20 final candidates.
6. Sort best first.

Write the raw ideas to `artifacts/name-exploration/phonetic-aesthetics-raw.json` as an array of strings or grouped objects.
Write the final names to `artifacts/name-exploration/phonetic-aesthetics-candidates.json`.

### Final candidate schema

Every final candidate must have exactly this shape or richer:

```json
{
  "name": "candidate",
  "rationale": "1-3 sentences grounded in the product identity and naming territory.",
  "category": "abstract",
  "strategy_source": "phonetic-aesthetics",
  "territory": "specific sub-territory or metaphor",
  "pronunciation": "plain English pronunciation guide",
  "why_creative": "why this is distinctive, ownable, and not generic",
  "risk": "main naming risk or tradeoff"
}
```

