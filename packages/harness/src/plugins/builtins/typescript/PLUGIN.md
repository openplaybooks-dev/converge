---
name: typescript
version: 1.0.0
description: TypeScript type checking and coding task type
---

# typescript

Registers `tsc` check (runs `npx tsc --noEmit`) and a `coding` task type
with TypeScript checks enabled by default.

## Checks

- **tsc** — Type-checks the project without emitting files.

## Task Types

- **coding** — Implementation tasks. Default skill: `coding-agent`, checks: `['tsc']`.

## Variables

| Key        | Value          |
|------------|----------------|
| `language` | `"typescript"` |
