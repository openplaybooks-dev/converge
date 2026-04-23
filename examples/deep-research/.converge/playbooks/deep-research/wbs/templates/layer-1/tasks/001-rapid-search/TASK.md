---
id: "{{taskId}}"
title: "Rapid search — layer {{layer}}"
skill: research-rapid-search
checks:
  - id: rapid-search-written
    cmd: "test -f {{artifactsDir}}/001-rapid-search/rapid-search.json"
    description: "rapid-search.json exists"
  - id: topics-queried
    cmd: "node -e \"const f=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/001-rapid-search/rapid-search.json','utf-8')); if(!f.queries||f.queries.length<5)throw new Error('need at least 5 queries')\""
    description: "At least 5 topic areas queried"
---

# Rapid Search — Layer {{layer}}

Query multiple topic areas simultaneously to understand the research landscape.

**Research question**: {{question}}

## Process

1. Analyze the research question to identify distinct topic facets
2. Create 5-8 search queries covering different angles:
   - Factual queries (what, who, when, where)
   - Analytical queries (why, how)
   - Comparative queries (X vs Y)
   - Causal queries (what causes, what leads to)
3. Execute searches for each query
4. Record results: query text, result count, promising sources

## Output

Write `{{artifactsDir}}/001-rapid-search/rapid-search.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "queries": [
    {
      "id": "Q1",
      "text": "Search query text",
      "type": "factual|analytical|comparative|causal",
      "resultCount": 15,
      "promisingSources": ["source-1", "source-2"]
    }
  ],
  "topicsIdentified": ["topic-1", "topic-2", ...],
  "searchCoverage": "How well the queries cover the research question"
}
```

## Quality Criteria

- At least 5 distinct queries covering different angles
- Each query returns relevant results
- Topics identified span the breadth of the research question