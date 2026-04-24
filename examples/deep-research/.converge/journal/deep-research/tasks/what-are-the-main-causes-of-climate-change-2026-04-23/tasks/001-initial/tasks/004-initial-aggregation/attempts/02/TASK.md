# Task: deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/001-initial/004-initial-aggregation

# Initial Aggregation

Synthesize Phase 1 findings and gate the transition to research-x.

**Research question**: What are the main causes of climate change?
**Artifacts dir**: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23

## Inputs

Read all prior Phase 1 outputs:
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/search.md`
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/sources.json`
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/scope.json`

## Process

1. **Key Findings**: Extract the most important discoveries from Phase 1
2. **Sub-topic Refinement**: Finalize the sub-topics for research-x epochs
3. **Depth Recommendation**: Confirm or adjust the research depth
4. **Initial Confidence**: Establish baseline confidence level
5. **Research-x Readiness**: Confirm Phase 1 quality gate

## Output

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/summary.json`:
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