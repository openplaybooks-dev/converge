---
id: "{{taskId}}"
title: "Decompose: {{subtopicName}}"
depends_on:
  - 001-research
checks:
  - id: decomposition-written
    cmd: "test -f {{artifactsDir}}/2-research/{{subtopicId}}-decompose.json"
    description: "Decomposition decision exists"
---

# Decomposition Decision: {{subtopicName}} — Epoch {{epoch}}

**Subtopic**: {{subtopicName}}
**Subtopic ID**: {{subtopicId}}
**Epoch**: {{epoch}}

## Your Task

Based on the research conducted in `{{artifactsDir}}/2-research/{{subtopicId}}.md`, decide if this subtopic needs to be broken down into sub-subtopics for deeper investigation.

## Decision Criteria

**Decompose if:**
- The subtopic is broad and covers multiple distinct areas
- Research identified significant knowledge gaps requiring focused investigation
- Findings suggest complexity that warrants deeper analysis
- Multiple distinct mechanisms, processes, or aspects were identified

**Don't decompose if:**
- The subtopic is already narrow and well-defined
- Research provided comprehensive coverage
- Further breakdown would be too granular
- Remaining gaps are minor or don't warrant separate investigation

## Input

Read: `{{artifactsDir}}/2-research/{{subtopicId}}.md`

## Output Format

Write `{{artifactsDir}}/2-research/{{subtopicId}}-decompose.json`:
```json
{
  "subtopicId": "{{subtopicId}}",
  "subtopicName": "{{subtopicName}}",
  "epoch": {{epoch}},
  "shouldDecompose": true,
  "rationale": "Detailed explanation of why this subtopic should or should not be decomposed",
  "subSubtopics": [
    {
      "id": "{{subtopicId}}-1",
      "name": "Sub-subtopic name",
      "description": "What this sub-subtopic covers",
      "priority": 1,
      "expectedDepth": "medium"
    }
  ],
  "totalSubSubtopics": 3
}
```

## Quality Standards

- **Clear rationale** for decomposition decision
- **If decomposing**: Identify 2-5 sub-subtopics that are distinct and meaningful
- **Each sub-subtopic** should have clear scope and purpose
- **Priority ranking** based on importance to the research question
