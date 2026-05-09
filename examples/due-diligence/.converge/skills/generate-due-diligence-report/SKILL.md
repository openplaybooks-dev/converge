---
id: generate-due-diligence-report
title: Generate Due Diligence Report
---

# Generate Due Diligence Report

Read all collected data and generate a self-contained HTML due diligence report with risk scoring, evidence, and recommendations.

## Contract

**Inputs:**
- `artifactsRoot` (string) — Path to all collected artifacts
- `company` (string) — Company name
- `website` (string) — Company website

**Outputs:**
- `{{artifactsRoot}}/report/index.html` — Self-contained HTML report

## Data Sources

Read these files before generating:
- `{{artifactsRoot}}/company-site/site-data.json`
- `{{artifactsRoot}}/sec-edgar/sec-data.json` (may not exist for private companies)
- `{{artifactsRoot}}/glassdoor/people-data.json`
- `{{artifactsRoot}}/news-search/news-data.json`
- `{{artifactsRoot}}/wayback/history-data.json`
- `{{artifactsRoot}}/deep-dive/executives/*.json`
- `{{artifactsRoot}}/deep-dive/products/*.json` (if any)
- `{{artifactsRoot}}/deep-dive/risks/*.json` (if any)
- `{{artifactsRoot}}/deep-dive/legal/*.json` (if any)
- `{{artifactsRoot}}/risk-assessment.json`

## Report Structure

Generate a single `index.html` with the following sections. The report must be fully self-contained (inline styles, no external dependencies). All screenshots should be referenced via relative paths from the artifacts directory.

### 1. Executive Summary
- Company name, website, date of report
- Overall risk score (1-10, where 10 = lowest risk)
- One-paragraph summary of findings
- Key recommendation: PROCEED / CAUTION / WARNING
- Quick stats: financial health score, employee satisfaction, legal risk level, news sentiment ratio

### 2. Company Profile
- What they do (from site-data + SEC)
- Size (employees, locations)
- Leadership team (table with names, titles, tenure)
- Products / services (list with descriptions)
- Timeline of key events (from all sources)

### 3. Financial Analysis
- Revenue trends (from SEC if public)
- Growth trajectory
- Risk factors (from 10-K)
- Recent material events (from 8-Ks)
- For private companies: note that financial data is limited

### 4. People & Culture
- Glassdoor ratings (visual score card)
- Employee review themes
- Salary competitiveness
- Red flags: layoff mentions, restructuring, management turnover

### 5. Market & News Sentiment
- News coverage summary
- Sentiment breakdown (pie chart or bar visualization using inline CSS)
- Recent positive developments
- Recent negative developments
- Risk signals detected

### 6. Legal & Compliance
- Active lawsuits
- Regulatory actions
- Risk assessment per legal item

### 7. Website Evolution
- Wayback Machine findings
- Positioning changes over time
- Key milestones visualized

### 8. Red Flags
Prioritized list of all red flags discovered across all sources. Each flag includes:
- Severity (CRITICAL / HIGH / MEDIUM / LOW)
- Source (which data file it came from)
- Evidence (screenshot reference or data excerpt)
- Recommended follow-up action

### 9. Diagrams & Visualizations
Nine Excalidraw diagrams have been generated alongside this report. Each can be opened at https://excalidraw.com for interactive viewing, editing, and export to PNG/SVG.

Create a visual diagram index with a card for each diagram:

| # | Diagram | Description |
|---|---------|-------------|
| 1 | Company Overview Dashboard | Mind-map overview of identity, products, people, financials |
| 2 | Leadership Org Chart | Hierarchical org chart with red flag indicators |
| 3 | Financial Health Scorecard | Revenue, metrics, risk factors, material events |
| 4 | Employee Sentiment Scorecard | Glassdoor ratings, review themes, signals |
| 5 | News Sentiment & Coverage Map | Radial category map with sentiment, key headlines |
| 6 | Legal & Compliance Risk Matrix | Materiality × probability grid |
| 7 | Key Events Timeline | Chronological timeline across all sources |
| 8 | Red Flags Priority Map | Severity-sorted risk register |
| 9 | Master Aggregation Dashboard | All sections combined: 3200×2200 comprehensive master view |

Each card should:
- Show the diagram number and title as a link to the `.excalidraw` file
- Include a thumbnail description
- Note: "Open at excalidraw.com → Export as PNG/SVG for inclusion in presentations"

Link format: `<a href="../diagrams/0X-diagram-name.excalidraw">Open Diagram X</a>`

### 10. Appendix
- Links to all source data files
- Links to all 9 Excalidraw diagram files
- Screenshot gallery
- Methodology notes

## Style Guidelines

- Professional, clean design
- Color scheme: dark navy header, white background, accent colors for scores
- Risk scores: green (8-10), yellow (5-7), red (1-4)
- Use CSS for visualizations (no JavaScript chart libraries)
- Print-friendly
- Mobile-responsive
