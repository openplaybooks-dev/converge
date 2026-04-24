# Task: deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/002-research-x/002-subtopic-research/epoch-1-002-subtopic-ST-E1-1/ST-E1-1-decompose

# Decomposition Decision:  — Epoch 1

**Subtopic**: 
**Subtopic ID**: ST-E1-1
**Epoch**: 1

## Your Task

Based on the research conducted in `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-1.md`, decide if this subtopic needs to be broken down into sub-subtopics for deeper investigation.

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

Read: `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-1.md`

## Output Format

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-1-decompose.json`:
```json
{
  "subtopicId": "ST-E1-1",
  "subtopicName": "",
  "epoch": 1,
  "shouldDecompose": true,
  "rationale": "Detailed explanation of why this subtopic should or should not be decomposed",
  "subSubtopics": [
    {
      "id": "ST-E1-1-1",
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