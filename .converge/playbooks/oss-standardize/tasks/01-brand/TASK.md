---
title: Brand Consolidation
mode: spawner
spawn:
  min_children: 1
blocking: true
---

Complete the harness→converge rename across the entire codebase.

Sequential pipeline to avoid file conflicts during renames:
1. Source files (.ts) — rename imports, class names, variable names
2. Documentation (.md) — rename all prose references
3. Config files (.json, .yml) — rename package names, script names
4. License & Security — update SECURITY.md, LICENSE headers
5. CLI references — update help text, command names, banner art
6. Verification audit — grep-based proof of zero stale references

Each task has deterministic grep-based checks proving zero stale
references remain in its file category.

Emit six `converge spawn task` commands for this fixed sequence:
`001-source-rename`, `002-docs-rename`, `003-config-rename`,
`004-license-security`, `005-cli-rename`, `006-verification-audit`.

Preserve the sequential dependencies and task contracts documented in
`./wbs.js`, but emit only CLI spawn commands.
