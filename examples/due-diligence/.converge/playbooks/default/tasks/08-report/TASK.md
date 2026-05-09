---
id: 08-report
title: "Phase 4 — Generate Diagrams & Final Report"
outputs:
  - .converge/artifacts/due-diligence/diagrams/manifest.json
  - .converge/artifacts/due-diligence/diagrams/01-company-overview.excalidraw
  - .converge/artifacts/due-diligence/diagrams/02-leadership-orgchart.excalidraw
  - .converge/artifacts/due-diligence/diagrams/03-financial-health.excalidraw
  - .converge/artifacts/due-diligence/diagrams/04-employee-sentiment.excalidraw
  - .converge/artifacts/due-diligence/diagrams/05-news-sentiment.excalidraw
  - .converge/artifacts/due-diligence/diagrams/06-legal-risk-matrix.excalidraw
  - .converge/artifacts/due-diligence/diagrams/07-key-events-timeline.excalidraw
  - .converge/artifacts/due-diligence/diagrams/08-red-flags.excalidraw
  - .converge/artifacts/due-diligence/diagrams/09-master-aggregation.excalidraw
  - .converge/artifacts/due-diligence/report/index.html
depends_on:
  - 07-cross-reference
vars:
  artifactsRoot: .converge/artifacts/due-diligence
checks:
  - id: diagrams-manifest-exists
    cmd: test -f .converge/artifacts/due-diligence/diagrams/manifest.json
    description: diagram manifest written
  - id: all-diagrams-exist
    cmd: node .converge/checks/check-all-diagrams.js
    description: all 9 .excalidraw files exist with content
  - id: report-exists
    cmd: test -f .converge/artifacts/due-diligence/report/index.html
    description: index.html written
  - id: report-has-diagram-refs
    cmd: node .converge/checks/check-report-diagrams.js
    description: report references at least 6 of 9 diagrams
  - id: report-has-content
    cmd: node .converge/checks/check-report-sections.js
    description: report contains all required sections
---

# Phase 4: Generate Diagrams & Final Report

This task has two steps:

## Step 1: Generate All 9 Excalidraw Diagrams

Use the skill `generate-due-diligence-diagrams` to read all collected data and generate 9 professional `.excalidraw` diagram files under `.converge/artifacts/due-diligence/diagrams/`.

The skill specifies exact layouts, color conventions, data bindings, and coordinate grids for each diagram:

| # | Diagram | What It Shows |
|---|---------|---------------|
| 1 | Company Overview Dashboard | Mind-map overview: identity, products, people, financials, risks, key metrics |
| 2 | Leadership Org Chart | Hierarchical org chart with red flag indicators per executive |
| 3 | Financial Health Scorecard | Revenue trends, key metrics, risk factors, material events |
| 4 | Employee Sentiment Scorecard | Glassdoor ratings as gauges, review themes, signals |
| 5 | News Sentiment & Coverage Map | Radial category map with sentiment coloring, key headlines |
| 6 | Legal & Compliance Risk Matrix | Legal items grid with materiality × probability |
| 7 | Key Events Timeline | Chronological timeline of 15-25 key events from all sources |
| 8 | Red Flags Priority Map | Severity-sorted register: Critical → High → Medium → Low |
| 9 | Overall Risk Score Dashboard | Executive summary with 6-dimension scorecards |

Reference the `excalidraw` skill for element schema, colors, arrow bindings, and layout conventions.

## Step 2: Generate HTML Report

Use the skill `generate-due-diligence-report` to produce the final HTML report at `.converge/artifacts/due-diligence/report/index.html`.

The report must:
- Include a **Diagrams** section that links to all 9 `.excalidraw` files (open in https://excalidraw.com)
- Embed diagram file paths as relative links
- Include all sections from the report skill spec
- Be self-contained (no external CSS/JS dependencies)
