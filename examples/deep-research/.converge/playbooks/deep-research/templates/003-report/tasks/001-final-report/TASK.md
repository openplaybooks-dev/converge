---
id: "{{taskId}}"
title: "Final Report"
skill: research-final-report
vars:
  questionDir:
checks:
  - id: report-written
    cmd: "test -f {{questionDir}}/output/3-report/final-report.md"
    description: "final-report.md exists"
---

# Final Report

Read `{{questionDir}}/question.md` and all prior artifacts under `{{questionDir}}/output/`:
- `1-initial/search.md`
- `1-initial/sources.json`
- `1-initial/scope.json`
- `1-initial/summary.json`
- `2-research/deep-research.md`

Synthesize them into a comprehensive markdown report at `{{questionDir}}/output/3-report/final-report.md`. Use this structure:

```markdown
# Research Report: <restate the question>

## Executive Summary

3-5 bullet points covering the most important findings. State overall confidence (high/medium/low) and one-line caveat.

## Background

What's at stake in this question, and why it matters. 1-2 paragraphs.

## Methodology

How this report was produced: initial survey → scope identification → focused sub-topic research → synthesis.

## Key Findings

For each major finding (4-7 of them):

### Finding N: <short claim>

- **Evidence**: the strongest 2-3 sources backing this finding (cite by author/year/venue)
- **Reasoning**: the chain of inference from evidence to claim
- **Counter-evidence**: what would weaken or refute this finding
- **Confidence**: high|medium|low + why

## Cross-Finding Insights

3-5 things that only become visible when you look across the findings together.

## What's Still Open

Honest enumeration of: contradictions we couldn't resolve, evidence gaps, areas that turned out more complex than expected.

## Conclusion

The most defensible single-paragraph answer to the question, with stated confidence and the most important caveat.

## References

Numbered list of every source cited above. **Each reference must be a clickable markdown link** — `[1] [Title (Author, Year, Venue)](https://...)`. Use real, working URLs:

- Papers → arXiv link (`https://arxiv.org/abs/...`) or DOI (`https://doi.org/...`)
- Books → publisher page or canonical URL
- Blog posts / posts → original URL
- If you genuinely don't know the URL for a source, omit the source — do not invent URLs. Don't use `#` or fake placeholder links.

Inline citations in the body should also be clickable, e.g. `[Brown et al., 2020](https://arxiv.org/abs/2005.14165)`.
```

Use the `Write` tool. Target ~2000-3500 words. Every factual claim must trace to a real source.

Also write `{{questionDir}}/output/3-report/summary.json`:

```json
{
  "question": "...",
  "overall_confidence": "high|medium|low",
  "key_findings_count": 5,
  "sources_cited": 18,
  "unresolved_questions": 3
}
```
