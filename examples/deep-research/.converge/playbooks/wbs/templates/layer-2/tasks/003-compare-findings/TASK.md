---
id: "{{taskId}}"
title: "Compare findings — layer {{layer}}"
skill: research-compare-findings
checks:
  - id: comparison-written
    cmd: "test -f {{artifactsDir}}/003-compare-findings/comparison.json"
    description: "comparison.json exists"
---

# Compare Findings — Layer {{layer}}

Compare findings across promising areas to identify connections and contradictions.

**Research question**: {{question}}

## Inputs

Read `{{artifactsDir}}/002-cross-analysis/cross-analysis.json`

## Process

1. Analyze each area's findings for cross-area patterns:
   - Connections: How does finding in Area A relate to finding in Area B?
   - Contradictions: Do findings in different areas conflict?
   - Complements: Do findings from different areas together support a larger conclusion?
2. For each connection/contradiction:
   - Document what the connection/contradiction is
   - Assess its significance for the research question
   - Identify which sources are involved
3. Classify each as:
   - **connection**: findings support each other across areas
   - **contradiction**: findings conflict across areas
   - **complementary**: findings together support larger conclusion

## Output

Write `{{artifactsDir}}/003-compare-findings/comparison.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "crossAreaInsights": [
    {
      "id": "CAI-1",
      "type": "connection|contradiction|complementary",
      "areasInvolved": ["PA-1", "PA-2"],
      "description": "What the connection/contradiction is",
      "significance": "Why this matters for the research question",
      "sourcesInvolved": ["SRC-001", "SRC-003"],
      "resolution": "How the connection is established or contradiction is characterized"
    }
  ],
  "summary": "Overall characterization of cross-area relationships"
}
```

## Quality Criteria

- At least one cross-area insight identified
- Each insight documents areas involved, significance, and resolution
- Contradictions are not forced to resolve — genuinely contested areas are flagged