---
id: "{{taskId}}"
title: "Layer {{layer}} — Breadth Survey"
wbs:
  type: nodejs
  path: ./wbs/wbs.js
---

# Layer {{layer}} — Breadth Survey

Rapidly explore the research landscape to identify promising areas for deeper investigation.

**Research question**: {{question}}
**Domain**: {{domain}}
**Layer**: {{layer}}
**Artifacts dir**: {{artifactsDir}}

## Layer {{layer}} Phases

1. **Rapid Search** — Query multiple topic areas simultaneously
2. **Surface Gather** — Collect high-level sources across identified topics
3. **Area Identification** — Identify 3-5 promising areas warranting deeper exploration
4. **Aggregation** — Synthesize findings, decide what to investigate in next layer

## Quality Gate

Layer {{layer}} aggregation must identify **at least {{minPromisingAreas}} promising areas** to proceed to the next layer. If fewer areas meet the threshold, the research terminates with current layer report.