---
name: eslint
version: 1.0.0
description: ESLint code quality checks
---

# eslint

Registers an `eslint` check that lints `src/` with configurable extensions
and optional auto-fix.

## Checks

- **eslint** — Runs ESLint on the `src/` directory.

## Options

| Option       | Default                          | Description                  |
|--------------|----------------------------------|------------------------------|
| `fix`        | `false`                          | Run with `--fix` flag        |
| `extensions` | `[".ts", ".tsx", ".js", ".jsx"]` | File extensions to lint      |
