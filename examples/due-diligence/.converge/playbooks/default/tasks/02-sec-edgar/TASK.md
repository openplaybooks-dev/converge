---
id: 02-sec-edgar
title: "Phase 1 — Search SEC EDGAR"
skill: browser-search-edgar
outputs:
  - .converge/artifacts/due-diligence/sec-edgar/sec-data.json
  - .converge/artifacts/due-diligence/sec-edgar/screenshots/
vars:
  artifactsRoot: .converge/artifacts/due-diligence/sec-edgar
checks:
  - id: sec-data-exists
    cmd: test -f .converge/artifacts/due-diligence/sec-edgar/sec-data.json
    description: sec-data.json written
  - id: sec-data-valid
    cmd: node .converge/checks/check-sec-data.js
    description: sec-data.json valid (handles private companies gracefully)
---

# Phase 1: Search SEC EDGAR

Use agent-browser to search the SEC EDGAR database for **{{company}}** (ticker: **{{ticker}}**).

## Objective

Search for and extract data from the company's SEC filings: 10-K (annual), 10-Q (quarterly), and 8-K (material events). Extract financial metrics, risk factors, legal proceedings, and management discussion.

The skill `browser-search-edgar` has the full procedure. Key outputs:

- `sec-data.json` — structured filing data
- `screenshots/` — evidence screenshots of key sections

## Handling Private Companies

If no ticker is provided or EDGAR returns no results, the task should still succeed. Write `sec-data.json` with `"publicCompany": false` and a note. The check handles this case.
