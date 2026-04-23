# Task: 01-brand/001-source-rename

Find and replace all stale brand references in TypeScript source files.

**Scope**: All `.ts` files under `packages/*/src/`

**Replacements** (case-preserving):
- `harness` → `converge` (when used as product/framework name)
- `Harness` → `Converge`
- `HARNESS` → `CONVERGE`
- `HarnessClient` → `ConvergeClient`
- `harness-client` → `converge-client`
- `crew` → appropriate converge equivalent (context-dependent)
- `crewadd` → remove or replace
- `sheetsrun` → remove or replace

**Exceptions** — do NOT rename:
- `auto-verify` directory (internal module, formerly `harness/`)
- Third-party references (e.g., `test-harness` patterns)
- Git history references in comments

**Process**:
1. Run `grep -ri 'harness\|crew\|sheetsrun' --include='*.ts' packages/` to find all occurrences
2. Review each match for context — is it a product name or a generic word?
3. Apply replacements file by file
4. Write a manifest to `.converge/standardize-state/brand/001-source.json`:
```json
{
  "filesModified": ["path/to/file.ts"],
  "replacements": 42,
  "skipped": ["path/to/exception.ts — reason"]
}
```