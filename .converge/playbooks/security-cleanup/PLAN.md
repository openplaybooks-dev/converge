# Security Cleanup Playbook — PLAN

## Goal

Make the Converge monorepo safe for public GitHub publication by removing
all hardcoded API keys, tracked .env files, build artifacts, and adding
safeguards against future leaks.

## Decision

Process Pipeline — six sequential phases, each producing a qualitatively
different artifact. No fan-out needed since each phase is a singleton.

## Children

| ID | Kind | Objective | Depends On | Outputs |
|---|---|---|---|---|
| `01-audit` | leaf | Scan repo, produce `audit.json` with all findings | none | `.converge/security-cleanup/audit.json` |
| `02-rotate` | leaf | Produce `rotation-checklist.md` from audit | audit | `.converge/security-cleanup/rotation-checklist.md` |
| `03-purge` | leaf | Replace secrets with placeholders, git-rm .env files | rotate | cleaned source files, `.converge/security-cleanup/purge-log.json` |
| `04-clean` | leaf | Remove build artifacts, update .gitignore | purge | updated `.gitignore`, `.converge/security-cleanup/clean-log.json` |
| `05-harden` | leaf | Add pre-commit hook + CI secret scan | clean | `.git/hooks/pre-commit`, `.github/workflows/secret-scan.yml` |
| `06-verify` | leaf | Re-run audit, assert zero findings | harden | `.converge/security-cleanup/verification-report.json` |

## Test Points

- **Playbook-level**: no secrets in tracked files, no .env files tracked, no build artifacts tracked, .gitignore covers backup patterns, pre-commit hook exists, CI workflow exists
- **Per-phase**: each phase's TASK.md has output existence + content checks
- **Reusable**: `tests/no-secrets/` — grep-based secret scan used by both audit and verify

## Open Questions

- Whether to use `git filter-repo` (needs separate install) or `git filter-branch` (built-in but deprecated) for history rewrite — decided: document both, use filter-branch by default since it requires no install
- Whether to delete brand exploration PNGs or move to Git LFS — decided: git-rm them, they're design artifacts not source code
