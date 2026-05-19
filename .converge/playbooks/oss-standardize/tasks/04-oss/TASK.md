---
title: Open Source Readiness
mode: spawner
spawn:
  min_children: 1
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

Emit five `converge spawn task` commands for this fixed sequence:
`001-community-health`, `002-ci-cd`, `003-npm-config`,
`004-changelog-process`, `005-security-scan`.

Preserve the task details and dependencies from `./wbs.js`, but emit only
CLI spawn commands.
