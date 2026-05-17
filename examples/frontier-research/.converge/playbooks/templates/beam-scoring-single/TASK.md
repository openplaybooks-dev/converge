---
id: "{{taskId}}"
title: "Beam scoring — epoch {{epoch}} beam {{beamId}}"
skill: frontier-score-beam
vars:
  epoch:
  beamId:
  beamJson:
  explorationJson:
checks:
  - id: beam-score-written
    cmd: "test -f {{artifactsDir}}/scores/beam-{{beamId}}.json"
    description: "score result exists for this beam"
  - id: beam-score-valid
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/scores/beam-{{beamId}}.json','utf-8')); for(const k of ['novelty','evidence','coherence','depth','generativity','composite']){if(typeof s[k]!=='number')throw new Error('missing numeric '+k)} if(!s.keyInsight)throw new Error('missing keyInsight')\""
    description: "score result has 5 numeric dimensions, composite, and keyInsight"
---

# Beam Scoring — Epoch {{epoch}} / Beam {{beamId}}

Score beam **{{beamId}}** on the 5 dimensions (novelty, evidence, coherence, depth, generativity) per the `frontier-score-beam` skill.

The beam definition is in `beamJson`:

```
{{beamJson}}
```

The beam's exploration result is in `explorationJson`:

```
{{explorationJson}}
```

Score each dimension 0-1 with justification, compute `composite = 0.25*novelty + 0.20*evidence + 0.20*coherence + 0.20*depth + 0.15*generativity`, identify the single most important insight, and note strengths and weaknesses.

## Output

Write `{{artifactsDir}}/scores/beam-{{beamId}}.json` with: `beamId`, the 5 dimension scores (each numeric), `composite` (numeric), `keyInsight` (string), `strengths[]`, `weaknesses[]`, and per-dimension `justifications`.
