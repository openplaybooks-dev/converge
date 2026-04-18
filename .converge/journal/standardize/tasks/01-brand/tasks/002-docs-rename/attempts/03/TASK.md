# Task: 01-brand/002-docs-rename

Find and replace all stale brand references in Markdown documentation.

**Scope**: All `.md` files under `packages/`, `docs/`, root `README.md`, `CONTRIBUTING.md`

**Replacements** (case-preserving):
- `harness` → `converge` (product name context)
- `Harness` → `Converge`
- `HARNESS` → `CONVERGE`
- `.harness/` → `.converge/` (directory references)
- `harness run` → `converge run` (CLI commands)
- `harness-planning` → `converge-planning`
- `harness-control` → `converge-control`
- ASCII art banners containing "HARNESS" → replace with "CONVERGE"
- `crew`/`crewadd`/`sheetsrun` → remove or replace contextually

**Exceptions** — do NOT rename:
- CHANGELOG entries documenting the rename itself
- Files inside `.converge/` playbook directories
- `auto-verify` references (internal module name)

**Process**:
1. Run grep to find all occurrences
2. Review and replace contextually
3. Pay special attention to README.md ASCII art banner
4. Write manifest to `.converge/standardize-state/brand/002-docs.json`