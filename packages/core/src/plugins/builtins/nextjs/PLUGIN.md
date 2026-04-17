---
name: nextjs
version: 1.0.0
description: Next.js build and lint checks
requires: [typescript]
---

# nextjs

Adds Next.js build and lint verification. Extends the `coding` task type
with an additional `lint` check.

## Checks

- **build** — Runs `npx next build`.
- **lint** — Runs `npx next lint`.

## Options

| Option      | Default | Description                    |
|-------------|---------|--------------------------------|
| `appDir`    | `true`  | Use App Router directory layout |
| `turbopack` | `false` | Enable Turbopack builds         |

## Variables

| Key         | Value       |
|-------------|-------------|
| `framework` | `"nextjs"`  |
| `appDir`    | from option |
| `turbopack` | from option |
