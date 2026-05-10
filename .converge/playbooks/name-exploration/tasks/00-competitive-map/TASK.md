---
id: 00-competitive-map
title: Competitive and Semantic White-Space Map
description: Map crowded AI/dev-tool naming spaces and identify underexplored creative territories.
outputs:
  - artifacts/name-exploration/competitive-map.json
  - artifacts/name-exploration/white-space-map.md
checks:
  - id: map-valid
    cmd: jq empty artifacts/name-exploration/competitive-map.json
    description: Competitive map JSON is valid
  - id: white-space-exists
    cmd: test -s artifacts/name-exploration/white-space-map.md
    description: White-space memo exists
  - id: crowded-zones
    cmd: jq -e '.crowded_zones | length >= 10' artifacts/name-exploration/competitive-map.json
    description: Crowded naming zones documented
  - id: opportunity-zones
    cmd: jq -e '.opportunity_zones | length >= 12' artifacts/name-exploration/competitive-map.json
    description: Opportunity zones documented
---

# Competitive and White-Space Map

Map naming spaces the project should avoid and spaces it should explore deeply. Include AI orchestration tools, workflow engines, build tools, CI systems, task runners, agent frameworks, and premium developer brands.

Required crowded zones: Agent*, AI*, Lang*, Chain*, Crew*, Flow*, Graph*, Task*, Auto*, Bot*, Forge*, Ops*, Run*, Check*, Copilot-like names, generic Latin SaaS, and random five-letter vowel names.

Required opportunity zones:

- proof and verification artifacts;
- weaving, binding, stitching, edges, seams;
- navigation instruments and bearings;
- musical structure and counterpoint;
- publishing proofs and galleys;
- graph theory without saying graph;
- craft precision and fit;
- state machines, ledgers, traces, receipts;
- ecological networks and mycelial systems;
- mathematical convergence and fixed points;
- ritual/checkpoint/completion language;
- calm control and enterprise trust without enterprise bloat.
