---
id: research-survey
title: Literature Review
---

# Literature Review

Survey existing knowledge relevant to the research question.

## Process

1. Identify key terms and concepts from the research question
2. Search for existing research, papers, documentation, and prior work
3. Summarize findings with source citations
4. Identify gaps in existing knowledge
5. Note conflicting findings or open questions

## Outputs

- `literature-review.md` — narrative summary of existing knowledge
- `known-findings.json` — structured findings with sources:
  ```json
  {
    "question": "...",
    "findings": [
      { "finding": "...", "source": "...", "confidence": "high|medium|low" }
    ],
    "gaps": ["..."],
    "conflicts": ["..."]
  }
  ```

## Quality Criteria

- At least 3 distinct sources cited
- Each finding has an attributed source
- Gaps in existing knowledge are explicitly identified
