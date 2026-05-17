---
id: "{{taskId}}"
title: "Beam exploration — epoch {{epoch}} beam {{beamId}}"
skill: frontier-explore-beam
vars:
  epoch:
  beamId:
  beamJson:
checks:
  - id: beam-exploration-written
    cmd: "test -f {{artifactsDir}}/explorations/beam-{{beamId}}.json"
    description: "exploration result exists for this beam"
  - id: beam-exploration-valid
    cmd: "node -e \"const r=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/explorations/beam-{{beamId}}.json','utf-8')); if(!r.beamId||!Array.isArray(r.insights)||r.insights.length<2)throw new Error('exploration must have beamId and at least 2 insights'); if(!r.hypothesisOutcome)throw new Error('missing hypothesisOutcome')\""
    description: "exploration result has beamId, insights, and hypothesisOutcome"
---

# Beam Exploration — Epoch {{epoch}} / Beam {{beamId}}

Execute beam **{{beamId}}** using the methodology it defined for itself.

The beam definition (direction, approach, hypothesis, exploration strategy) is in the `beamJson` var:

```
{{beamJson}}
```

Follow the `frontier-explore-beam` skill: read the beam definition, execute its strategy, record insights with evidence + confidence + novelty, test the hypothesis, document dead ends, and capture unexpected findings.

## Output

Write `{{artifactsDir}}/explorations/beam-{{beamId}}.json` with at least: `beamId`, `insights[]` (each with claim/evidence/confidence/novelty), `hypothesisOutcome` (supported|refuted|modified|inconclusive), `deadEnds[]`, `unexpectedFindings[]`, and `followUpDirections[]`.
