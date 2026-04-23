---
id: "{{taskId}}"
title: "Initial Search"
skill: web-search
checks:
  - id: search-results-written
    cmd: "test -f {{artifactsDir}}/001-initial-search/search-results.json"
    description: "search-results.json exists"
---

# Initial Search

Perform broad search across the research topic to understand the landscape.

**Research question**: {{question}}
**Domain**: {{domain}}
**Artifacts dir**: {{artifactsDir}}

## Process

1. **Broad Query Strategy**: Generate multiple search queries covering different aspects of the question
2. **Search Execution**: Run searches in parallel across different angles
3. **Result Collection**: Gather initial results with source URLs and snippets
4. **Topic Area Mapping**: Identify 5-8 distinct topic areas emerging from results

## Output

Write `{{artifactsDir}}/001-initial-search/search-results.json`:
```json
{
  "researchQuestion": "{{question}}",
  "searchQueries": [
    { "query": "query text", "angle": "aspect covered", "resultsCount": 10 }
  ],
  "topicAreas": [
    { "id": "TA-1", "area": "Topic area name", "description": "Brief description" }
  ],
  "initialSources": [
    { "url": "source url", "title": "Source title", "relevance": 0.8 }
  ]
}
```

## Quality Criteria

- At least 5 distinct topic areas identified
- Initial sources have relevance scores
- Search queries cover different angles of the question