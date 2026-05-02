---
id: "{{taskId}}"
title: "Literature review — epoch {{epoch}}"
skill: research-literature
checks:
  - id: sources-written
    cmd: "test -f {{artifactsDir}}/literature/sources.json"
    description: "sources.json exists"
  - id: sources-valid
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/literature/sources.json','utf-8')); if(!s.sources||!Array.isArray(s.sources)||s.sources.length===0)throw new Error('empty sources')\""
    description: "sources.json has at least one source"
  - id: prior-state-written
    cmd: "test -f {{artifactsDir}}/literature/prior-state.json"
    description: "prior-state.json exists"
---

# Literature Review — Epoch {{epoch}}

Survey and structure existing knowledge relevant to the research question.

**Research question**: {{question}}
**Domain**: {{domain}}

## Cross-Epoch Context

Check for prior epoch artifacts:
- Read `{{projectDir}}/.converge/artifacts/scientific-research/research-ledger.jsonl` for prior quality scores and gap analyses
- Read prior epoch `sources.json` files to avoid duplicate searches and build on existing coverage
- Read prior epoch `convergence/gap-analysis.md` to target gaps identified in previous iterations

For epoch 1, start fresh. For subsequent epochs, perform **incremental** search — focus on gaps and weak areas identified in prior iterations.

## Process

1. If prior epochs exist, read their literature outputs and gap analyses
2. Identify key terms, concepts, and search facets from the research question
3. Search for existing research, papers, documentation, and prior work
4. For each source, extract structured citation data
5. Summarize the state of knowledge (what is known, what is uncertain, what is missing)

## Outputs

Write `{{artifactsDir}}/literature/sources.json`:
```json
{
  "question": "{{question}}",
  "epoch": {{epoch}},
  "searchStrategy": "Description of search approach",
  "sources": [
    {
      "id": "S1",
      "title": "...",
      "authors": ["..."],
      "year": 2024,
      "type": "paper|book|documentation|empirical|expert-opinion",
      "relevance": "high|medium|low",
      "keyFindings": ["..."],
      "methodology": "Description of study methodology if applicable",
      "limitations": ["..."],
      "url": "..."
    }
  ],
  "knowledgeGaps": ["..."],
  "conflicts": ["..."]
}
```

Write `{{artifactsDir}}/literature/prior-state.json`:
```json
{
  "epoch": {{epoch}},
  "totalSourcesAcrossEpochs": 0,
  "newSourcesThisEpoch": 0,
  "coverageAssessment": "Description of how well the literature covers the question",
  "majorGaps": ["..."],
  "emergingThemes": ["..."]
}
```
