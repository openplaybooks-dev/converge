---
title: Quality Gates
blocking: true
---

Run quality verification across the codebase and produce audit reports.
Depends on `01-brand` completing first (code changes finalized).

Subtasks:
1. Lint & format — run linter and formatter, fix violations
2. Build verification — verify all packages build cleanly
3. Test coverage — run tests with coverage, report gaps
4. Type coverage — verify TypeScript strict mode compliance
