# Release Notes Template

Use this template when cutting a release vX.Y.Z.

## Release Header

```markdown
## [X.Y.Z] - YYYY-MM-DD
```

## Sections (in order)

### Breaking

> ⚠️ **These changes may break existing playbooks.** Review migration steps before upgrading.

- **RFC NNNN**: Description of breaking change. Migration: `converge migrate --rfc=NNNN`.

### Added

- **RFC NNNN**: New feature or capability.
- New command: `converge <command>` for <purpose>.
- New skill: `<skill-name>` for <purpose>.

### Changed

- **RFC NNNN**: Description of change.
- Performance: <metric> improved by <X>%.
- API: <endpoint> now returns <new format>.

### Fixed

- **RFC NNNN**: Description of fix.
- Bug: <symptom> no longer occurs when <condition>.

### Removed

- Deprecated field: `<field-name>` (use `<replacement>` instead).
- Legacy command: `converge <old-command>` (migrate to `converge <new-command>`).

### Security

- Fixed: <vulnerability description>.
- Added: <security improvement>.

## Migration Guide

For each breaking change:

1. **RFC NNNN**: `<title>`
   - What changed: `<description>`
   - How to migrate: `<steps or command>`
   - Verification: `<how to confirm migration succeeded>`

## Contributors

This release includes work from the following RFCs:

| RFC | Title | Type | Author |
|-----|-------|------|--------|
| NNNN | `<title>` | `<type>` | `<author>` |
