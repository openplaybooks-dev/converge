---
id: "{{taskId}}"
title: "Area identification — layer {{layer}}"
skill: research-area-identify
checks:
  - id: areas-written
    cmd: "test -f {{artifactsDir}}/003-area-identification/areas.json"
    description: "areas.json exists"
  - id: area-count
    cmd: "node -e \"const f=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/003-area-identification/areas.json','utf-8')); if(!f.promisingAreas||f.promisingAreas.length<3)throw new Error('need at least 3 areas')\""
    description: "At least 3 promising areas identified"
---

# Area Identification — Layer {{layer}}

Identify 3-5 promising areas from the gathered sources that warrant deeper investigation.

**Research question**: {{question}}

## Process

1. Review all gathered sources and their content summaries
2. Identify thematic clusters — areas where multiple sources converge
3. For each cluster/area, assess:
   - **Evidence strength**: How many sources support this area?
   - **Insight potential**: How likely is deeper investigation to yield new understanding?
   - **Novelty**: Is this area well-explored or does it have gaps?
   - **Relevance**: How directly does this area address the research question?
4. Score and rank areas by composite: `0.3*evidence + 0.3*insight + 0.2*novelty + 0.2*relevance`
5. Select top 3-5 promising areas for next layer

## Output

Write `{{artifactsDir}}/003-area-identification/areas.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "promisingAreas": [
    {
      "id": "PA-1",
      "name": "Area name",
      "description": "What this area covers",
      "supportingSources": ["SRC-001", "SRC-003"],
      "evidenceStrength": 0.8,
      "insightPotential": 0.75,
      "novelty": 0.6,
      "relevance": 0.85,
      "compositeScore": 0.76,
      "rationale": "Why this area is promising for deeper investigation"
    }
  ],
  "rejectedAreas": [
    {
      "name": "Rejected area name",
      "reason": "Why it was not selected",
      "sourcesConsidered": ["SRC-005"]
    }
  ]
}
```

## Quality Criteria

- At least 3 promising areas identified
- Each area has explicit scoring on all dimensions
- Rejected areas are documented with rationale
- Areas are distinct (non-overlapping) or overlap is noted