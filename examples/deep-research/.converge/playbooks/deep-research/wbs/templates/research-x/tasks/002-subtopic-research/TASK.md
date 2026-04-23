---
id: "{{taskId}}"
title: "Sub-topic Research"
wbs:
  type: nodejs
  path: ./wbs/wbs.js
checks:
  - id: research-written
    cmd: "test -f {{artifactsDir}}/epoch-{{epoch}}-002-subtopic-research/research-results.json"
    description: "research-results.json exists"
---

# Sub-topic Research — Epoch {{epoch}}

Research all sub-topics for this epoch in parallel.

**Research question**: {{question}}
**Epoch**: {{epoch}}
**Artifacts dir**: {{artifactsDir}}

## Inputs

Read from prior task:
- `{{artifactsDir}}/epoch-{{epoch}}-001-subtopic-split/subtopics.json`

## Process

1. **Read Sub-topics**: Get the list of sub-topics to research
2. **Parallel Research**: For each sub-topic, conduct thorough research
3. **Result Compilation**: Aggregate all sub-topic findings

## Output

Write `{{artifactsDir}}/epoch-{{epoch}}-002-subtopic-research/research-results.json`:
```json
{
  "epoch": {{epoch}},
  "subtopicResults": [
    {
      "subtopicId": "ST-E{{epoch}}-1",
      "subtopic": "Sub-topic name",
      "findings": [
        {
          "finding": "Specific finding",
          "sources": ["source 1", "source 2"],
          "confidence": 0.85
        }
      ],
      "keyInsights": ["insight 1", "insight 2"],
      "remainingGaps": ["gap 1"],
      "researchDepth": "shallow|medium|deep"
    }
  ],
  "totalFindings": 15,
  "overallConfidence": 0.7
}
```

## Quality Criteria

- All sub-topics from split phase are researched
- Each sub-topic has multiple findings with source citations
- Key insights clearly articulated
- Remaining gaps identified for potential future epochs