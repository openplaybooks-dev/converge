---
id: "{{taskId}}"
title: "Final Report"
skill: research-final-report
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/3-report/final-report.md"
    description: "final-report.md exists"
---

# Final Report

Generate comprehensive final report from all research findings.

**Research question**: {{question}}
**Artifacts dir**: {{artifactsDir}}

## Inputs

Read all research outputs:
- `{{artifactsDir}}/1-initial/summary.json`
- `{{artifactsDir}}/2-research/*.md` (all research files)

## Process

1. **Cumulative Synthesis**: Combine all findings into coherent picture
2. **Key Insights Selection**: Select the most important insights for the report
3. **Structure Development**: Organize report with clear sections
4. **Source Integration**: Cite sources throughout
5. **Quality Check**: Verify report completeness and accuracy

## Output

Write `{{artifactsDir}}/3-report/final-report.md`:

```markdown
# Research Report: [Topic]

## Executive Summary
[2-3 paragraph overview of the research and key findings]

## Background
[Context and motivation for the research]

## Methodology
[How the research was conducted across epochs]

## Key Findings

### Finding 1: [Title]
[Detailed finding with sources]

### Finding 2: [Title]
[Detailed finding with sources]

...

## Insights from Multiple Epochs

### Epoch-by-Epoch Summary
[How understanding evolved across research-x epochs]

## Remaining Questions
[Any open questions or areas for further research]

## Conclusion
[Final synthesis and recommendations]

## References
[List of all sources cited]
```

Also write `{{artifactsDir}}/3-report/summary.json`:
```json
{
  "reportTitle": "Research Report: [Topic]",
  "totalEpochs": 5,
  "totalSubtopicsInvestigated": 15,
  "overallConfidence": 0.85,
  "keyFindings": ["finding 1", "finding 2"],
  "sourcesConsulted": 50
}
```

## Quality Criteria

- Report is comprehensive and well-structured
- All key findings have source citations
- Insights from multiple epochs are synthesized
- Report addresses the original research question
- Clear conclusion with actionable takeaways