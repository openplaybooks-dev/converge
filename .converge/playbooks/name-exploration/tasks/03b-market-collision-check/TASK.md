---
id: 03b-market-collision-check
title: Market Collision and Ownability Check
description: Add qualitative collision risk beyond npm availability.
inputs:
  - artifacts/name-exploration/validated-candidates.json
  - artifacts/name-exploration/competitive-map.json
outputs:
  - artifacts/name-exploration/collision-checked-candidates.json
  - artifacts/name-exploration/collision-summary.md
checks:
  - id: collision-valid
    cmd: jq empty artifacts/name-exploration/collision-checked-candidates.json
    description: Collision-checked JSON is valid
  - id: count-matches
    cmd: |
      in=$(jq 'length' artifacts/name-exploration/validated-candidates.json)
      out=$(jq 'length' artifacts/name-exploration/collision-checked-candidates.json)
      test "$in" -eq "$out"
    description: No candidates lost
  - id: all-have-collision
    cmd: jq -e 'all(has("collision_risk") and has("ownability_notes"))' artifacts/name-exploration/collision-checked-candidates.json
    description: Every candidate has collision risk and ownability notes
  - id: summary-exists
    cmd: test -s artifacts/name-exploration/collision-summary.md
    description: Collision summary exists
---

# Market Collision and Ownability Check

For every validated candidate, add qualitative risk fields beyond npm:

```json
{
  "collision_risk": "low|medium|high",
  "ownability_notes": "short note",
  "domain_search_notes": "manual/search TODO or obvious concern",
  "github_org_notes": "manual/search TODO or obvious concern",
  "trademark_notes": "not legal advice; likely diligence area",
  "market_collision_tags": ["real-word", "dev-tool", "ai-crowded"]
}
```

Do not claim legal clearance. This is a strategic screen to help ranking avoid obvious collision traps.
