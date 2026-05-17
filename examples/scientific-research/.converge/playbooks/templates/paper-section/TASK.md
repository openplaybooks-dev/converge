---
id: "{{taskId}}"
title: "Paper section: {{section}} — epoch {{epoch}}"
skill: research-draft-section
vars:
  epoch:
  question:
  domain:
  section:
checks:
  - id: section-written
    cmd: "test -f {{artifactsDir}}/paper-draft/{{section}}.md"
    description: "Section markdown file exists"
  - id: section-nonempty
    cmd: "test -s {{artifactsDir}}/paper-draft/{{section}}.md"
    description: "Section file is non-empty"
---

# Paper section: {{section}}

Draft the `{{section}}` section of the academic paper for epoch {{epoch}}.

**Research question**: {{question}}
**Domain**: {{domain}}

## Inputs

Read all upstream epoch artifacts as relevant to this section:
- `{{artifactsDir}}/literature/sources.json`
- `{{artifactsDir}}/hypothesize/hypotheses.json`
- `{{artifactsDir}}/experiment/` — per-hypothesis result files
- `{{artifactsDir}}/statistical-analysis/statistics.json`
- `{{artifactsDir}}/statistical-analysis/meta-analysis.json`
- `{{artifactsDir}}/evidence-synthesis/evidence-grades.json`
- `{{artifactsDir}}/contradiction-resolution/contradictions.json`

Follow the section-specific guidance in the `research-draft-section` skill for `{{section}}`.

## Output

Write `{{artifactsDir}}/paper-draft/{{section}}.md` containing the rendered section in markdown with formal academic tone, inline `[Author, Year]` citations, and explicit links from claims to evidence.
