---
id: 01-sitemap
title: Sitemap
description: Define the product sitemap and page hierarchy
blocking: true
depends_on:
  - 01-market-research
inputs:
  - docs/product/research/RESEARCH_REPORT.md
outputs:
  - docs/product/SITEMAP.md
checks:
  - id: sitemap-exists
    cmd: test -f docs/product/SITEMAP.md
skills:
  - sitemap-design
cmd: scripts/stub.py
---

# Sitemap

Write SITEMAP.md.