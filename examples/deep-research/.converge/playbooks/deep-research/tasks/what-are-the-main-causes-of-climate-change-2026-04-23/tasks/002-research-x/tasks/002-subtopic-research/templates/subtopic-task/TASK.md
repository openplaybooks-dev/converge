---
id: "{{taskId}}"
title: "Research: {{subtopicName}}"
wbs:
  type: nodejs
  path: {{templatesDir}}/002-research-x/tasks/002-subtopic-research/templates/subtopic-task/wbs/wbs.js
vars:
  subtopicId: "{{subtopicId}}"
  subtopicName: "{{subtopicName}}"
  subtopicDescription: "{{subtopicDescription}}"
  epoch: "{{epoch}}"
  question: "{{question}}"
  domain: "{{domain}}"
  artifactsDir: "{{artifactsDir}}"
  templatesDir: "{{templatesDir}}"
  maxEpochs: "{{maxEpochs}}"
checks:
  - id: subtopic-research-written
    cmd: "test -f {{artifactsDir}}/2-research/{{subtopicId}}.md"
    description: "Subtopic research output exists"
---

# Research: {{subtopicName}} — Epoch {{epoch}}

Research sub-topic: **{{subtopicName}}**

**Description**: {{subtopicDescription}}

**Research question**: {{question}}
**Epoch**: {{epoch}}
**Sub-topic ID**: {{subtopicId}}

## Process

1. **Deep Research**: Conduct thorough research on this sub-topic
2. **Source Collection**: Gather credible sources and citations
3. **Insight Extraction**: Identify key findings and insights
4. **Gap Analysis**: Note remaining unknowns or areas needing more research

## Output

Write `{{artifactsDir}}/epoch-{{epoch}}-002-subtopic-research/{{subtopicId}}/research.json`:
```json
{
  "subtopicId": "{{subtopicId}}",
  "subtopicName": "{{subtopicName}}",
  "epoch": {{epoch}},
  "findings": [
    {
      "finding": "Specific finding about this sub-topic",
      "sources": ["source 1", "source 2"],
      "confidence": 0.85
    }
  ],
  "keyInsights": ["insight 1", "insight 2"],
  "remainingGaps": ["gap 1", "gap 2"],
  "researchDepth": "medium"
}
```

## Quality Criteria

- At least 3 distinct findings with source citations
- Key insights clearly articulated
- Remaining gaps documented for potential follow-up