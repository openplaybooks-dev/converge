# Migration Report: wbs → seeds rename (02e)

**Task:** 02-rename-wbs-to-seeds/02e-migrate-playbooks
**Date:** 2026-05-01
**Scope:** All live playbooks in phase-01 catalog (excluding dbt-paradigm) + all examples/

## Summary

| Playbook | Seeds Created | Tasks Updated | Status |
|---|---|---|---|
| cli-redesign | 1 (pre-existing) | 1 (from 02b) | OK |
| cli-to-core-extraction | 0 (none needed) | 0 | OK |
| declarative-discovery | 0 (none needed) | 0 | OK |
| generate-docs | 3 (reference, examples, troubleshooting) | 3 | OK |
| implement-feature | 1 (pre-existing) | 1 | OK |
| landing-page | 1 (pre-existing, task-level) | 1 | OK |
| oss-standardize | 0 (none needed) | 0 | OK |
| remove-epic | 0 (none needed) | 0 | OK |
| remove-goals | 0 (none needed) | 0 | OK |
| self-improvement-loop | 1 (pre-existing) | 1 | OK |

## generate-docs — detailed migration

### Files moved

| Before | After |
|---|---|
| `tasks/05-examples/wbs/index.js` | `tasks/05-examples/seeds/examples.seed.js` |
| `tasks/05-examples/wbs/templates/example-page/` | `tasks/05-examples/seeds/examples/templates/example-page/` |
| `tasks/07-troubleshooting/wbs/index.js` | `tasks/07-troubleshooting/seeds/troubleshooting.seed.js` |
| `tasks/07-troubleshooting/wbs/templates/symptom-page/` | `tasks/07-troubleshooting/seeds/troubleshooting/templates/symptom-page/` |
| `tasks/08-reference/wbs/index.js` | `tasks/08-reference/seeds/reference.seed.js` |
| `tasks/08-reference/wbs/templates/cli-command/` | `tasks/08-reference/seeds/reference/templates/cli-command/` |

### Frontmatter changes

Updated from inline `type: nodejs, path: ./wbs/index.js` to named `seeds: [<name>]`:
- `05-examples/TASK.md`: `seeds: [examples]`
- `07-troubleshooting/TASK.md`: `seeds: [troubleshooting]`
- `08-reference/TASK.md`: `seeds: [reference]`

### Template path updates

TEMPLATE_ROOT in each seed script updated: `wbs/templates` → `seeds/<name>/templates`.
Also fixed `docs` → `generate-docs` playbook path prefix that was incorrect.

## Examples — bulk migration

All 132 wbs directories across examples/ were migrated to seeds/ using an automated script.
Seed .js files updated with corrected template paths.
TASK.md frontmatter updated from `path: ./wbs/index.js` to `path: ./seeds/<name>.seed.js`.

## Verification

- Zero `wbs:` frontmatter anywhere in `.converge/playbooks/` or `examples/`
- Zero `wbs/` directories anywhere in `.converge/playbooks/` or `examples/`
- All TASK.md files updated with correct seeds: references
- All .seed.js files updated with corrected template paths
