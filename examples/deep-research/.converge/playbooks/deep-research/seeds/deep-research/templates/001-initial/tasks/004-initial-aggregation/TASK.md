---
id: "{{taskId}}"
title: "Initial Aggregation"
skill: research-layer-aggregate
checks:
  - id: aggregation-written
    cmd: "test -f {{artifactsDir}}/1-initial/summary.json"
    description: "summary.json exists"
---

# Initial Aggregation

Synthesize Phase 1 findings and gate the transition to research-x.

**Research question**: {{question}}
**Artifacts dir**: {{artifactsDir}}

## Inputs

Read all prior Phase 1 outputs:
- `{{artifactsDir}}/1-initial/search.md`
- `{{artifactsDir}}/1-initial/sources.json`
- `{{artifactsDir}}/1-initial/scope.json`

## Process

1. **Key Findings**: Extract the most important discoveries from Phase 1
2. **Sub-topic Refinement**: Finalize the sub-topics for research-x epochs
3. **Depth Recommendation**: Confirm or adjust the research depth
4. **Initial Confidence**: Establish baseline confidence level
5. **Research-x Readiness**: Confirm Phase 1 quality gate

## Output

Write `{{artifactsDir}}/1-initial/summary.json`:
```json
{
  "phase": "initial",
  "keyFindings": [
    {
      "id": "KF-1",
      "finding": "Specific finding discovered",
      "supportingSources": ["SRC-001"],
      "confidence": 0.8
    }
  ],
  "scopedSubtopics": [
    {
      "id": "ST-1",
      "subtopic": "Sub-topic name",
      "rationale": "Why this warrants research",
      "priority": 1
    }
  ],
  "keyUncertainties": [
    { "uncertainty": "Description", "impact": "Why it matters" }
  ],
  "recommendedDepth": "deep",
  "initialConfidence": 0.5,
  "researchXReady": true,
  "nextActions": ["Begin research-x epochs focusing on high-priority sub-topics"]
}
```

## Quality Criteria

- At least 5 scoped sub-topics confirmed
- Initial confidence score established
- Research-x readiness flag set to true
- Quality gate passed