---
id: "{{taskId}}"
title: "Experiment — {{hypothesisId}} (epoch {{epoch}})"
skill: research-experiment
vars:
  epoch:
  question:
  domain:
  hypothesisId:
  hypothesisStatement:
  testPlan:
checks:
  - id: result-written
    cmd: "test -f {{artifactsDir}}/experiment/{{hypothesisId}}.json"
    description: "Per-hypothesis result file exists"
  - id: result-valid
    cmd: "node -e \"const r=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/experiment/{{hypothesisId}}.json','utf-8')); if(!r.hypothesisId||!r.effectSize||!r.methodology)throw new Error('missing fields')\""
    description: "Result has hypothesisId, effectSize and methodology"
---

# Experiment — {{hypothesisId}}

Test the hypothesis using the methodology declared in its `testPlan`.

**Research question**: {{question}}
**Domain**: {{domain}}
**Hypothesis ({{hypothesisId}})**: {{hypothesisStatement}}
**Test plan**: {{testPlan}}

## Inputs

- `{{artifactsDir}}/hypothesize/hypotheses.json` — full hypothesis object including falsification criteria
- `{{artifactsDir}}/literature/sources.json` — supporting evidence sources

## Output

Write `{{artifactsDir}}/experiment/{{hypothesisId}}.json`:
```json
{
  "epoch": {{epoch}},
  "hypothesisId": "{{hypothesisId}}",
  "methodology": "Description of how the hypothesis was tested",
  "treatment": "...",
  "control": "...",
  "outcomeMeasure": "...",
  "effectSize": { "type": "cohens_d", "value": 0.0, "magnitude": "negligible|small|medium|large" },
  "confidenceInterval": { "lower": 0.0, "upper": 0.0, "level": 0.95 },
  "sampleSize": { "n1": 0, "n2": 0 },
  "outcome": "supports|refutes|inconclusive",
  "confounders": ["..."],
  "limitations": ["..."]
}
```
