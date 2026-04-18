# Task: 02-docs/007-adrs

Create Architecture Decision Records for key design decisions.

**Create** `docs/adr/README.md` (index) and individual ADR files.

**ADRs to document** (read codebase to understand each decision):
1. `001-filesystem-first.md` — Why state lives on the filesystem, not a database
2. `002-gap-driven-convergence.md` — Why convergence loop over graph/DAG execution
3. `003-wbs-decomposition.md` — Why WBS scripts for dynamic task generation
4. `004-playbook-format.md` — Why YAML + Markdown over pure code or pure config
5. `005-monorepo-structure.md` — Why monorepo with separate packages

**ADR format** (standard template):
```markdown
# ADR-NNN: Title

**Status**: Accepted
**Date**: 2026-04-18

## Context
What is the issue that we're seeing that motivates this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```