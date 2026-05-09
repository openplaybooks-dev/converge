# Due Diligence — Multi-Source Company Research

A **production-grade** multi-source company due diligence pipeline for the Converge framework. Researches a company across 5 public sources in parallel using [agent-browser](https://github.com/vercel-labs/agent-browser), cross-references findings, detects red flags, and generates a risk-scored report with screenshot evidence.

All sources are **public** — no accounts, no credentials, no ToS concerns.

## Quick Start

```bash
# 1. Install agent-browser
npm install -g agent-browser
agent-browser install

# 2. Run the playbook against a public company
converge run \
  --playbook default \
  --company "UiPath" \
  --website "https://www.uipath.com" \
  --ticker "PATH"

# Or edit company-input.json and run with the default inputs
converge run --playbook default
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `company` | yes | — | Company name to research |
| `website` | yes | — | Company website URL |
| `ticker` | no | — | Stock ticker for SEC EDGAR searches |

## Architecture: 4-Phase Pipeline

**Run mode**: `oneoff`. Phase 1 runs 5 browser sessions in parallel. Phase 2 dynamically spawns deep-dive tasks based on Phase 1 discoveries. Phase 3 cross-references. Phase 4 generates the report.

```
Phase 1 (parallel):
  01-company-site   → crawl website, extract products/leadership/claims
  02-sec-edgar      → search EDGAR, extract 10-K/10-Q/8-K
  03-glassdoor      → extract reviews, ratings, salary data
  04-news-search    → gather recent coverage, categorize sentiment
  05-wayback        → historical website analysis, timeline changes

Phase 2 (dynamic seed):
  06-deep-dive      → spawns per-executive, per-product, per-risk subtasks

Phase 3:
  07-cross-reference → verify claims, detect red flags, score risk

Phase 4:
  08-report          → generate 9 Excalidraw diagrams + HTML report

## Visualizations: 9-Diagram Suite

Phase 4 generates 9 professional Excalidraw diagrams visualizing every dimension of the analysis:

| # | Diagram | Content |
|---|---------|---------|
| 1 | **Company Overview Dashboard** | Mind-map: identity, products, people, financials, metrics |
| 2 | **Leadership Org Chart** | Hierarchical chart with red flag indicators per executive |
| 3 | **Financial Health Scorecard** | Revenue trends, metrics, risk factors, material events |
| 4 | **Employee Sentiment Scorecard** | Glassdoor gauges, review themes, signals |
| 5 | **News Sentiment & Coverage Map** | Radial category map with sentiment coloring |
| 6 | **Legal & Compliance Risk Matrix** | Materiality × probability grid |
| 7 | **Key Events Timeline** | 15-25 key events chronologically across all sources |
| 8 | **Red Flags Priority Map** | Severity-sorted register: Critical → Low |
| 9 | **Master Aggregation Dashboard** | All sections combined: 3200×2200 canvas with 11 framed sections (A-K) showing identity, financials, leadership, sentiment, news, legal, red flags, timeline, scorecard, data quality, and verdict — everything in one comprehensive view |

Each `.excalidraw` file opens at https://excalidraw.com for interactive viewing, editing, and export to PNG/SVG.
```

### Phase 1: Parallel Source Discovery

Five browser sessions run simultaneously via agent-browser, each with its own isolated `--session`. Each extracts structured data from its source and captures screenshots as evidence.

| Task | Source | Output |
|------|--------|--------|
| 01-company-site | Company website | `site-data.json` + screenshots/ |
| 02-sec-edgar | SEC EDGAR | `sec-data.json` + screenshots/ |
| 03-glassdoor | Glassdoor | `people-data.json` + screenshots/ |
| 04-news-search | Google News | `news-data.json` + screenshots/ |
| 05-wayback | Wayback Machine | `history-data.json` + screenshots/ |

### Phase 2: Dynamic Deep Dive

A seed script reads all 5 Phase 1 outputs and dynamically spawns subtasks:
- **Per executive**: Background check via news search + past companies
- **Per product line**: Market analysis, competitor comparison
- **Per risk factor** (from 10-K): Deep-dive research, related news/events
- **Per legal item**: Court records search, news corroboration
- **Per red flag**: Cross-source corroboration

### Phase 3: Cross-Reference & Risk Scoring

Claims verification, employee signal correlation, growth triangulation, leadership red flags, legal risk assessment. Produces `risk-assessment.json` with scored dimensions.

### Phase 4: Report Generation

Self-contained HTML report with executive summary, company profile, financial analysis, people & culture, legal & compliance, timeline, red flags, and screenshot evidence appendix.

## Why Converge?

Claude Code alone cannot run this pipeline because:

| Limitation | Converge Solution |
|---|---|
| Single-threaded (can't run 5 browser sessions at once) | 5 parallel agent-browser sessions with isolated `--session` flags |
| No retry/checkpointing for 3-hour research | `maxTaskAttempts: 3`, `resume: true` |
| Can't dynamically spawn subtasks for unknowns | Seed reads Phase 1 data, spawns exactly the right subtasks |
| No structured DAG for dependencies | 4-phase DAG: cross-reference waits for all discovery + deep-dive |
| Context window limits | Each task has focused context; artifacts persist structured data |

## Tool Dependencies

| Tool | Purpose | Install |
|------|---------|---------|
| agent-browser | Browser automation (all tasks) | `npm install -g agent-browser && agent-browser install` |
| node | JSON validation in checks | Built-in |

## Artifacts

```
.converge/artifacts/due-diligence/
├── company-site/
│   ├── site-data.json
│   └── screenshots/
├── sec-edgar/
│   ├── sec-data.json
│   └── screenshots/
├── glassdoor/
│   ├── people-data.json
│   └── screenshots/
├── news-search/
│   ├── news-data.json
│   └── screenshots/
├── wayback/
│   ├── history-data.json
│   └── screenshots/
├── deep-dive/
│   ├── executives/
│   ├── products/
│   ├── risks/
│   └── legal/
├── diagrams/
│   ├── manifest.json
│   ├── 01-company-overview.excalidraw
│   ├── 02-leadership-orgchart.excalidraw
│   ├── 03-financial-health.excalidraw
│   ├── 04-employee-sentiment.excalidraw
│   ├── 05-news-sentiment.excalidraw
│   ├── 06-legal-risk-matrix.excalidraw
│   ├── 07-key-events-timeline.excalidraw
│   ├── 08-red-flags.excalidraw
│   └── 09-master-aggregation.excalidraw
├── risk-assessment.json
└── report/
    └── index.html
```

## File Structure

```
examples/due-diligence/
├── README.md
├── company-input.json
├── scripts/
│   ├── fetch_company_assets.py       # Download company logo/favicon → base64
│   ├── aggregate_data.py             # Merge all Phase 1-3 data → consolidated JSON
│   └── generate_diagrams.py          # Generate 9 Excalidraw diagrams (400+ elements)
└── .converge/
    ├── project.yaml
    ├── skills/
    │   ├── excalidraw/SKILL.md
    │   ├── browser-crawl-company-site/SKILL.md
    │   ├── browser-search-edgar/SKILL.md
    │   ├── browser-extract-glassdoor/SKILL.md
    │   ├── browser-search-news/SKILL.md
    │   ├── browser-check-wayback/SKILL.md
    │   ├── browser-background-check/SKILL.md
    │   ├── browser-legal-check/SKILL.md
    │   ├── generate-due-diligence-diagrams/SKILL.md
    │   └── generate-due-diligence-report/SKILL.md
    └── playbooks/default/
        ├── playbook.yml
        ├── tasks/
        │   ├── 01-company-site/TASK.md
        │   ├── 02-sec-edgar/TASK.md
        │   ├── 03-glassdoor/TASK.md
        │   ├── 04-news-search/TASK.md
        │   ├── 05-wayback/TASK.md
        │   ├── 06-deep-dive/
        │   │   ├── TASK.md
        │   │   └── seeds/
        │   │       └── spawn-deep-dive.seed.js
        │   ├── 07-cross-reference/TASK.md
        │   └── 08-report/TASK.md
```
