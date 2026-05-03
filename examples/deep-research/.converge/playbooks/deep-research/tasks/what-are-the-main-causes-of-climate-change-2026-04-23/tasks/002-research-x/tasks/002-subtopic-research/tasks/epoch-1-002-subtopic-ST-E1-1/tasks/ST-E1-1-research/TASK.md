---
id: ST-E1-1-research
title: "Research: "
checks:
  - id: research-written
    description: Research markdown exists
    cmd: test -f /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-1.md
vars:
  taskId: ST-E1-1-research
  epoch: 1
  subtopicId: ST-E1-1
  subtopicName: null
  subtopicDescription: null
  question: What are the main causes of climate change?
  domain: environmental science
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/seed/templates
  maxEpochs: 10
---

# Research:  — Epoch 1

**CRITICAL**: Conduct REAL, substantive research on this subtopic using your knowledge base.

**Subtopic**: 
**Description**: 
**Research question**: What are the main causes of climate change?
**Epoch**: 1
**Subtopic ID**: ST-E1-1

## Your Task

Conduct deep research on this specific subtopic. Use your extensive knowledge to:

1. **Key Findings**: Identify 5-8 major findings about this subtopic with evidence
2. **Source Citations**: Reference real, credible sources (papers, reports, authoritative websites)
3. **Detailed Analysis**: Provide substantive explanations, not placeholder text
4. **Confidence Scoring**: Rate confidence for each finding based on evidence strength
5. **Knowledge Gaps**: Identify what remains unknown or needs deeper investigation

## Output Format

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-1.md` in markdown:

```markdown
# Research: 

**Subtopic ID**: ST-E1-1
**Epoch**: 1
**Research Date**: [current date]

## Overview

[Comprehensive paragraph explaining the research findings, their implications, and how they relate to the broader research question. This should be substantive, not placeholder text - minimum 200 words.]

## Key Findings

### F1: [Finding Title]

**Finding**: Specific, detailed finding with real content

**Evidence**: Detailed evidence and explanation

**Sources**:
- Real source 1 with title/author
- Real source 2

**Confidence**: 0.85
**Importance**: high

[... 5-8 findings total ...]

## Key Insights

1. Major insight 1 with substantive content
2. Major insight 2 with real analysis
3. [... minimum 3 insights ...]

## Knowledge Gaps

- Specific gap 1 that needs more research
- Specific gap 2 requiring deeper investigation

## Decomposition Assessment

**Needs Decomposition**: Yes/No

**Rationale**: Explain why this subtopic is complex enough to warrant breaking into sub-subtopics, or why it's sufficiently covered.

## Metadata

Also create `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-1.json`:
```json
{
  "subtopicId": "ST-E1-1",
  "subtopicName": "",
  "epoch": 1,
  "findingsCount": 8,
  "sourcesCount": 12,
  "needsDecomposition": true,
  "researchDepth": "deep",
  "timestamp": "ISO timestamp"
}
```
```

## Quality Standards

- **NO PLACEHOLDERS**: Every field must contain real, substantive content
- **Minimum 5 findings** with detailed evidence and real source citations
- **Minimum 3 key insights** that synthesize the findings
- **Overview paragraph** of at least 200 words
- **Real sources** - use your knowledge of actual publications, papers, and authoritative sources
- **Confidence scores** based on evidence strength (0.0-1.0)
- **Strategic assessment** of whether this subtopic needs further decomposition

This research will feed into deeper investigation layers. Quality here determines research depth.
