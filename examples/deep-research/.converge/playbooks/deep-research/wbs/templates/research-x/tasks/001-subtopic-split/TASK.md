---
id: "{{taskId}}"
title: "Sub-topic Split"
skill: research-subtopic-split
checks:
  - id: subtopics-written
    cmd: "test -f {{artifactsDir}}/epoch-{{epoch}}-001-subtopic-split/subtopics.json"
    description: "subtopics.json exists"
---

# Sub-topic Split — Epoch {{epoch}}

AI decides which sub-topics to research in this epoch.

**Research question**: {{question}}
**Epoch**: {{epoch}}
**Max epochs**: {{maxEpochs}}
**Artifacts dir**: {{artifactsDir}}

## Process

1. **Read Prior Context**: Check any existing epoch findings for context
2. **AI Analysis**: Given the research question and prior findings, decide sub-topics
3. **Sub-topic Definition**: For each sub-topic, define scope, approach, and expected insight

## Output

Write `{{artifactsDir}}/epoch-{{epoch}}-001-subtopic-split/subtopics.json`:
```json
{
  "epoch": {{epoch}},
  "subtopics": [
    {
      "id": "ST-E{{epoch}}-1",
      "subtopic": "Specific sub-topic to research",
      "scope": "What this covers in this epoch",
      "approach": "How to research this sub-topic",
      "expectedInsight": "What we expect to find",
      "priority": 1
    }
  ],
  "totalSubtopics": 3,
  "aiRationale": "Why these sub-topics, given prior findings..."
}
```

## Quality Criteria

- Sub-topics are distinct and collectively cover important ground
- Each sub-topic has clear scope and approach
- AI rationale documents the decision given prior epochs