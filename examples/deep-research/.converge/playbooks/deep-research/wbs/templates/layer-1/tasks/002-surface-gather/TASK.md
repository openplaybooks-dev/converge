---
id: "{{taskId}}"
title: "Surface gather — layer {{layer}}"
skill: research-surface-gather
checks:
  - id: sources-written
    cmd: "test -f {{artifactsDir}}/002-surface-gather/sources.json"
    description: "sources.json exists"
  - id: source-count
    cmd: "node -e \"const f=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/002-surface-gather/sources.json','utf-8')); if(!f.sources||f.sources.length<8)throw new Error('need at least 8 sources')\""
    description: "At least 8 sources gathered"
---

# Surface Gather — Layer {{layer}}

Collect high-level sources across the identified topic areas.

**Research question**: {{question}}

## Cross-Epoch Context

- Read `{{projectDir}}/.converge/artifacts/deep-research/source-registry.json` to avoid duplicate sources

## Process

1. For each promising source from rapid search:
   - Retrieve full content summary
   - Assess initial relevance (high/medium/low)
2. For each topic area:
   - Gather 2-3 additional sources at surface level
   - Focus on varied source types (papers, articles, reports)
3. Record all sources in source registry for deduplication

## Output

Write `{{artifactsDir}}/002-surface-gather/sources.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "sources": [
    {
      "id": "SRC-001",
      "title": "Source title",
      "type": "web-article|research-paper|book|report|video",
      "url": "https://...",
      "contentSummary": "2-3 sentence summary",
      "topicAreas": ["topic-1", "topic-2"],
      "relevanceScore": 0.75,
      "sourceQuality": "high|medium|low"
    }
  ],
  "topicCoverage": {
    "topic-1": ["SRC-001", "SRC-002"],
    "topic-2": ["SRC-003"]
  }
}
```

## Quality Criteria

- At least 8 unique sources gathered
- Sources span multiple topic areas
- No exact duplicates (content hash check)
- Source registry updated