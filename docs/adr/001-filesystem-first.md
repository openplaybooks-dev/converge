# ADR-001: Filesystem-First Storage

**Status**: Accepted
**Date**: 2026-04-18

## Context

Converge needs to persist task definitions, execution state, and configuration. Traditional approaches use databases (SQLite, Postgres) or cloud storage. However, Converge is designed for local-first autonomous execution where tasks are authored by humans, reviewed in PRs, and debugged without specialized tooling.

## Decision

All state lives on the filesystem. Authored configuration (task definitions, playbooks, goals) is stored as YAML and Markdown files committed to git. Runtime state (execution status, checkpoints, logs) is stored alongside authored files using naming conventions (e.g., `*.status.yaml`) and excluded via `.gitignore`.

The filesystem structure mirrors the execution structure: numeric prefixes define order, subdirectories define hierarchy, and auto-discovery replaces manual registration.

## Consequences

- **Easier**: Git integration is free — diffs, PRs, blame, and history work out of the box. Debugging requires only a text editor. No database setup or migrations. Teams can review task definitions in standard code review workflows.
- **Harder**: Complex queries across tasks require walking the filesystem. Concurrent writes need care (mitigated by single-machine execution model). No built-in indexing or search beyond what the OS provides.
