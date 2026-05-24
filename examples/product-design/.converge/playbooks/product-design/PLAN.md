# Product Design Playbook — PLAN

Transform a product idea into MVP concept mockups with epic → feature hierarchy.

## DAG

```
01-brief          → PRODUCT_BRIEF.md, SCOPE.md
02-research       → RESEARCH_REPORT.md, user-personas.md
03-architecture   → SITEMAP.md, USER_JOURNEYS.md, ARCHITECTURE.md
04-epics          → epics.json + feature catalogs (spawner)
05-design         → self-contained HTML mockup per feature (spawner)
10-package        → HANDOFF.md, TRACEABILITY.md
```

## Output

- `docs/product/` — briefs, research, architecture, handoff
- `docs/product/features/<epicId>/catalog.json` — feature lists per epic
- `.design/screens/<epicId>/<featureId>/design.html` — MVP concept mockups

Each mockup is a single self-contained HTML file — all CSS embedded, opens in any browser.
