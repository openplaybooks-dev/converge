---
name: changelog
description: Use when an RFC reaches `status: done` and a changelog entry needs to be written, when cutting a release version, when reviewing what changed since the last release, or when the user asks "what's new", "write a changelog", "update the CHANGELOG", or "generate release notes".
---

# Changelog — auto-generate from RFC metadata

## Purpose

Every RFC that reaches `status: done` should produce a corresponding CHANGELOG.md entry. This skill ensures the changelog stays synchronized with shipped work without manual authoring.

## When to invoke

Trigger on:
- "Write a changelog entry for RFC XXXX"
- "Update the to CHANGELOG.md" after an RFC implementation
- "Cut a release" / "what changed since last release?"
- An RFC's status transitions to `done`

## Trigger on user messages like:
- "changelog" / "write changelog" / "update CHANGELOG.md"
- "ship RFC 0034" / "release v0.4.0"
- "what's new since v0.3.0?"

## Do not invoke for:
- Editing the changelog format or structure → edit CHANGELOG.md directly
- Adding a new RFC → that's part of the RFC-writing workflow, not changelog

## Workflow: RFC done → changelog entry

### 1. Read the RFC frontmatter

Extract from `docs/rfcs/NNNN-*.md`:

```yaml
rfc: 0034
title: Ban depends_on; auto-chain tasks alphabetically within levels
status: done
type: refactor          # feat | fix | refactor | chore | breaking
source: human
priority_tier: tier1
backwards_compatible: no
risk: high
breaks_existing: yes
```

### 2. Map RFC type to CHANGELOG section

| RFC `type` | CHANGELOG section |
|---|---|
| `feat` | `### Added` |
| `fix` | `### Fixed` |
| `refactor` | `### Changed` |
| `chore` | `### Changed` |
| `breaking` (or `breaks_existing: yes`) | `### Breaking` (always top) |

### 3. Find related commits

```bash
git log --oneline --grep="RFC 0034" --grep="0034" --grep="depends_on" --all
```

Use commits to identify the key changes, but write the changelog entry from the RFC description, not the commit messages.

### 4. Write the changelog entry

Format:
```markdown
- **RFC 0034**: Ban `depends_on` from TASK.md frontmatter. Tasks at the same directory level are now auto-chained alphabetically by ID. Migration: `converge migrate --rfc=0034`.
```

Rules:
- One bullet per RFC, under the appropriate section
- Lead with the RFC number and title
- Describe what changed for the user, not internal implementation details
- Include migration instructions if `breaks_existing: yes`
- Keep to 1-2 sentences max
- Use backticks for code/field names
- End with a period

### 5. Place under `[Unreleased]`

Insert the entry under the correct section within `[Unreleased]`. If the section doesn't exist, create it. Sections order:

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

### 6. Update the RFC Progress table

Add a row to the RFC's Progress table:

```markdown
| Changelog entry | **done** | Added to CHANGELOG.md under [Unreleased] → Changed |
```

## CHANGELOG.md format

The file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/):

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking

### Added

### Changed

### Fixed

## [0.3.0] - 2026-05-15

### Added
- Initial monorepo structure
...
```

## Release cut workflow

When the user says "cut a release" or "release vX.Y.Z":

1. **Gather done RFCs** since last release:
   ```bash
   git log --oneline --since="2026-05-01" -- docs/rfcs/
   ```
   Check which RFCs have `status: done` in their frontmatter.

2. **Verify all done RFCs have changelog entries** — any missing, run the workflow above.

3. **Replace `[Unreleased]` with versioned header**:
   ```markdown
   ## [0.4.0] - 2026-05-22
   ```

4. **Add new `[Unreleased]` section** above the versioned section.

5. **Commit**:
   ```
   chore(release): v0.4.0

   Changes since v0.3.0:
   - RFC 0034: ...
   - RFC 0033: ...
   ```

## File map

```
.claude/skills/changelog/
  SKILL.md                    (this file — entry point and workflow)
  reference/
    format.md                 (Keep a Changelog format reference)
  templates/
    release-notes.md          (template for cutting releases)
CHANGELOG.md                  (root — single source of truth)
docs/rfcs/NNNN-*.md           (RFC metadata source)
```

## Key rules

1. **Never invent changelog entries** — every entry must map to a done RFC or a verified commit
2. **User-facing language** — describe what changed for users, not internal refactors
3. **One entry per RFC** — even if an RFC touches multiple files, it's one bullet
4. **Breaking changes go first** — under `### Breaking` at the top of each version section
5. **Include migration info** — if `breaks_existing: yes`, note how to migrate
6. **Link to RFC** — reference the RFC number in the entry
7. **Don't duplicate** — check if an entry already exists before adding
