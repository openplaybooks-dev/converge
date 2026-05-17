---
id: "{{taskId}}"
title: "Consolidate Generation {{wave}} Scores"
vars:
  wave:
outputs:
  - scored/gen-{{wave}}.json
checks:
  - id: gen-scores-exist
    cmd: test -f scored/gen-{{wave}}.json
    description: "Consolidated scores for generation {{wave}} exist"
  - id: gen-scores-valid
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('scored/gen-{{wave}}.json','utf-8')); if(s.generation!=={{wave}})throw new Error('wrong generation'); if(!Array.isArray(s.candidates)||s.candidates.length===0)throw new Error('no candidates'); if(!s.stats||typeof s.stats.max!=='number')throw new Error('bad stats')\""
    description: "Consolidated scores have correct shape"
---

# Consolidate Generation {{wave}} Scores

Merge all per-candidate score files from generation `{{wave}}` into a single
generation summary.

## Process

1. Read every file matching `scored/gen-{{wave}}-candidate-*.json` (the
   per-candidate evaluator outputs).
2. Combine into a single array sorted by `fitness` descending.
3. Compute population statistics: `mean`, `max`, `min`, `count` over the
   fitness values.

## Output

`scored/gen-{{wave}}.json`:

```json
{
  "generation": {{wave}},
  "candidates": [
    {
      "candidateId": "...",
      "fitness": 0.85,
      "scores": { "benchmarkPotential": 0.8, "...": "..." },
      "strengths": ["..."],
      "weaknesses": ["..."]
    }
  ],
  "stats": { "mean": 0.7, "max": 0.85, "min": 0.55, "count": 5 }
}
```

This is a pure file-merge step — no LLM reasoning is required. A simple
`node`/shell one-liner that globs `scored/gen-{{wave}}-candidate-*.json`,
parses each, sorts by fitness, and writes the consolidated JSON satisfies
the task.
