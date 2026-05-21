# Changelog Format Reference

## Keep a Changelog Sections

Each version section (including `[Unreleased]`) uses these subsections in order:

```markdown
## [Unreleased]

### Breaking
### Added
### Changed
### Fixed
### Deprecated
### Removed
### Security
```

## Entry Format

Each entry maps to one RFC or one significant change:

```markdown
- **RFC 0034**: Ban `depends_on` from TASK.md frontmatter. Tasks at the same directory level are now auto-chained alphabetically by ID. Migration: `converge migrate --rfc=0034`.
```

### Format Rules

- **Bold RFC reference**: Always start with `**RFC NNNN**: `
- **User-facing description**: What changed for the user, not implementation details
- **Migration info**: Include when `breaks_existing: yes` in RFC frontmatter
- **Code formatting**: Use backticks for field names, commands, paths
- **Length**: 1-2 sentences max
- **Period**: End with a period

## RFC Type → Section Mapping

| RFC `type` | CHANGELOG section |
|---|---|
| `feat` | `### Added` |
| `fix` | `### Fixed` |
| `refactor` | `### Changed` |
| `chore` | `### Changed` |
| `breaking` (or `breaks_existing: yes`) | `### Breaking` (always top) |
| `perf` | `### Changed` |
| `test` | `### Changed` |
| `docs` | `### Changed` |
| `revert` | `### Removed` |

## Version Header Format

```markdown
## [0.4.0] - 2026-05-22
```

- ISO 8601 date format
- Semantic versioning: MAJOR.MINOR.PATCH
- No space before the version number

## Breaking Changes Must Include

- The RFC number and title
- What changed (user-facing description)
- Migration path (if applicable)
- Why it was necessary (brief context)

Example:

```markdown
- **RFC 0034**: Ban `depends_on` from TASK.md frontmatter. Tasks at the same directory level are now auto-chained alphabetically by ID. Migration: `converge migrate --rfc=0034`. This eliminates manual dependency wiring and reduces the planning burden when managing hundreds of tasks.
```

## Non-RFC Changes

Sometimes changes don't have an RFC. These are prefixed with the scope:

```markdown
- **docs**: Add README with project architecture and setup instructions
- **test**: Improve test coverage for DAG runner
- **chore**: Update dependency versions
```

## What NOT to Include

- Commit hashes (they're in git history)
- Author names (they're in git history)
- Internal refactoring that doesn't affect user behavior
- Changes to test fixtures unless they fix a user-impacting bug
- Formatting changes, whitespace fixes, typo corrections (unless they fix user-visible bugs)

## Complete Example

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking

- **RFC 0034**: Ban `depends_on` from TASK.md frontmatter. Tasks at the same directory level are now auto-chained alphabetically by ID. Migration: `converge migrate --rfc=0034`.

### Added

- **RFC 0025**: Portable resume via inventory hydration. Playbooks can now resume after schema upgrades without losing state.

### Changed

- Renamed project from "harness" to "Converge"
- **RFC 0032**: Tasks are now authored exclusively in the `tasks/` folder. Inline task definitions in playbook.yml are no longer supported.

## [0.3.0] - 2026-05-15

### Added

- Initial monorepo structure with core, agentfn, codets, and kimifn packages
- Goal evaluation and convergence engine
- Checkpoint and cursor-based execution model
```
