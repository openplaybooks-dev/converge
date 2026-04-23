---
title: Open Source Readiness
wbs:
  type: nodejs
  path: ./wbs.js
blocking: true
---

Prepare the repository for public open-source release.
Depends on `01-brand` completing first (naming finalized).

Pipeline:
1. Community health files — Code of Conduct, issue/PR templates
2. GitHub Actions CI/CD — build, test, lint workflows
3. npm publish config — package.json audit for publishing
4. Changelog process — document how to maintain CHANGELOG.md
5. Security scan — pre-release security audit
