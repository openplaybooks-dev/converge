# devpulse — Codebase Health CLI

A single-binary CLI tool that measures, tracks, and reports on codebase health.
Production-quality demo — clean architecture, full test coverage, polished output.

## Core concept

`devpulse` runs checks against a codebase and produces a health score (0-100).
Run it in any project directory. History stored in SQLite. Trends visible over time.
Designed for CI integration, pre-commit hooks, and developer dashboards.

## Epics (goals)

### G1 — CLI Foundation
Runnable CLI with argument parsing, help text, version banner, and config loading.
- Scaffold TypeScript + Vitest project
- CLI entry with `commander`
- `--help` / `--version` with ASCII art
- `.devpulse.json` config loader
- `devpulse status` command
- Distribution: single `bin/devpulse.js` that runs with `node`

### G2 — Core Checks
Pluggable check system. Each check is a function that returns a result.
- Git stats (last commit, branch, contributors, dirty files)
- File stats (lines of code, files by type, largest files)
- Test runner (find test command, run it, parse pass/fail count)
- Dependency audit (outdated packages, severity levels)
- Type check (run `tsc --noEmit`, parse errors)
- `devpulse check` — run all enabled checks, print results table

### G3 — Scoring & Persistence
Health score engine + SQLite history.
- Weighted scoring formula (0-100) with per-check weights
- `devpulse health` — score + breakdown + recommendations
- SQLite schema for run history
- `devpulse history` — last N runs with trends
- Configurable thresholds (warn/fail per check)

### G4 — Watch & Automation
File watching, CI mode, custom rules, export.
- `devpulse watch` — re-run on file change (chokidar)
- `--ci` mode — exit code reflects health threshold
- Custom rules — regex-based checks from config
- `devpulse export --format json|markdown|csv`
- `devpulse badge` — SVG health badge for README

### G5 — Polish & Demo-Ready
Production-quality output, error handling, documentation.
- Colorized terminal output with chalk (green/yellow/red)
- Progress spinners for long-running checks
- Error recovery — one check failing doesn't crash the run
- `devpulse dashboard` — single-screen summary
- README, CONTRIBUTING, and inline help for every command
- End-to-end demo: clone a repo, run `devpulse health`, see full report

## Technical constraints
- TypeScript 5.7+ strict, Node.js 20+, ESM, pnpm
- `commander` for CLI, `chalk` for color, `better-sqlite3` for DB, `chokidar` for watch
- Vitest with ≥80% coverage target
- Single entry: `node bin/devpulse.js`
- All output parseable (machine-readable flags)

## What done looks like
```
$ devpulse health
  Converge — 78/100  ↑2 since last week

  type-check  .............. ✓ 0 errors
  tests  ................... ✓ 104 passing
  git  ..................... ✓ main, clean
  deps  .................... ⚠ 2 outdated
  files  ................... 847 ts, 38 md

  → run `devpulse history` to see 14-day trend
```

Every command verified by running it. Every check backed by real shell output.
No dead features — every line ships.
