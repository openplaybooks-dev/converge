---
id: "{{taskId}}"
title: "Initial Gather"
skill: research-gather
checks:
  - id: sources-written
    cmd: "test -f {{artifactsDir}}/002-initial-gather/sources.json"
    description: "sources.json exists"
---

# Initial Gather

Collect foundational sources and references for the research topic.

**Research question**: {{question}}
**Artifacts dir**: {{artifactsDir}}

## Inputs

Read from prior task:
- `{{artifactsDir}}/001-initial-search/search-results.json`

## Process

1. **Source Prioritization**: Rank sources by relevance and credibility
2. **Content Gathering**: Fetch and summarize key sources
3. **Gap Analysis**: Identify what information is covered and what's missing
4. **Source Catalog**: Build comprehensive source list with metadata

## Output

Write `{{artifactsDir}}/002-initial-gather/sources.json`:
```json
{
  "sources": [
    {
      "id": "SRC-001",
      "url": "source url",
      "title": "Source title",
      "type": "article|paper|report|web",
      "relevance": 0.9,
      "credibility": "high|medium|low",
      "keyPoints": ["key point 1", "key point 2"],
      "coverage": "what this source covers"
    }
  ],
  "gapAnalysis": {
    "covered": ["aspect 1", "aspect 2"],
    "missing": ["aspect 3", "aspect 4"]
  },
  "totalSources": 10
}
```

## Quality Criteria

- At least 10 sources gathered
- Each source has relevance and credibility scoring
- Gap analysis identifies at least 2 missing areas