---
id: 04-news-search
title: "Phase 1 — Search News Coverage"
skill: browser-search-news
outputs:
  - .converge/artifacts/due-diligence/news-search/news-data.json
  - .converge/artifacts/due-diligence/news-search/screenshots/
vars:
  artifactsRoot: .converge/artifacts/due-diligence/news-search
checks:
  - id: news-data-exists
    cmd: test -f .converge/artifacts/due-diligence/news-search/news-data.json
    description: news-data.json written
  - id: news-data-valid
    cmd: node .converge/checks/check-news-data.js
    description: news-data.json has at least 3 categorized articles
---

# Phase 1: Search News Coverage

Use agent-browser to search Google News for recent coverage of **{{company}}**.

## Objective

Gather recent news articles. Categorize by topic (product, funding, lawsuit, etc.) and sentiment (positive, negative, neutral). Run supplementary searches for risk-specific topics (lawsuit, layoffs, controversy).

The skill `browser-search-news` has the full procedure. Key outputs:

- `news-data.json` — structured news coverage with categorization
- `screenshots/` — evidence screenshots

## Quality Bar

- At least 20 articles scanned
- Each categorized by topic AND sentiment
- Supplementary risk searches run
