# Task: deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/001-initial/003-scope-identification

# Scope Identification

Identify the key areas and initial sub-topic candidates for deeper research.

**Research question**: What are the main causes of climate change?
**Artifacts dir**: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23

## Inputs

Read from prior tasks:
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/search.md`
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/sources.json`

## Process

1. **Area Clustering**: Group topics into coherent areas
2. **Sub-topic Discovery**: Identify sub-topics within each area
3. **Depth Assessment**: Evaluate complexity and scope of each sub-topic
4. **Priority Ranking**: Rank sub-topics by importance and tractability

## Output

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/scope.json`:
```json
{
  "scopedSubtopics": [
    {
      "id": "ST-1",
      "subtopic": "Sub-topic name",
      "parentArea": "Parent area",
      "description": "What this sub-topic covers",
      "complexity": "low|medium|high",
      "importance": 0.9,
      "relatedSources": ["SRC-001", "SRC-003"]
    }
  ],
  "keyUncertainties": [
    { "uncertainty": "Description of key unknown", "impact": "Why it matters" }
  ],
  "recommendedDepth": "shallow|medium|deep",
  "scopeBoundaries": {
    "inScope": ["what is covered"],
    "outOfScope": ["what is excluded"]
  }
}
```

## Quality Criteria

- At least 5 scoped sub-topics identified
- Key uncertainties documented
- Depth recommendation provided
- Scope boundaries clearly defined