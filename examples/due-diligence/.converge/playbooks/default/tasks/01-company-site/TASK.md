---
id: 01-company-site
title: "Phase 1 — Crawl Company Website"
skill: browser-crawl-company-site
outputs:
  - .converge/artifacts/due-diligence/company-site/site-data.json
  - .converge/artifacts/due-diligence/company-site/screenshots/
vars:
  artifactsRoot: .converge/artifacts/due-diligence/company-site
checks:
  - id: site-data-exists
    cmd: test -f .converge/artifacts/due-diligence/company-site/site-data.json
    description: site-data.json written
  - id: site-data-valid
    cmd: node .converge/checks/check-site-data.js
    description: site-data.json has required fields and arrays
  - id: screenshots-exist
    cmd: test -d .converge/artifacts/due-diligence/company-site/screenshots && test -f .converge/artifacts/due-diligence/company-site/screenshots/homepage.png
    description: at least homepage screenshot captured
---

# Phase 1: Crawl Company Website

Use agent-browser to crawl **{{website}}** and extract structured data about **{{company}}**.

## Objective

Navigate the company's public website. Extract: products/services, leadership team, office locations, job listings, press releases, and claims made on the site. Capture screenshots as evidence.

The skill `browser-crawl-company-site` has the full procedure. Key outputs:

- `site-data.json` — structured JSON with all extracted data
- `screenshots/` — evidence screenshots of key pages

## Safety

- Read-only browsing. Do NOT fill forms, click sign-up buttons, or submit anything.
- Skip any pages behind login walls.
- If a page doesn't load, retry once then skip and note.
