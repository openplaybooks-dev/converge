---
name: git
version: 1.0.0
description: Git auto-commit after task completion
---

# git

Auto-commits changes after each task completes and provides a `git-clean`
check to verify the working tree is clean.

## Checks

- **git-clean** — Passes when `git status --porcelain` is empty.

## Hooks

- **afterTask** — Auto-commits staged + unstaged changes (when `autoCommit` is enabled).

## Options

| Option         | Default  | Description                           |
|----------------|----------|---------------------------------------|
| `autoCommit`   | `true`   | Commit changes after each task        |
| `commitPrefix` | `"crew"` | Prefix for auto-generated commit messages |
