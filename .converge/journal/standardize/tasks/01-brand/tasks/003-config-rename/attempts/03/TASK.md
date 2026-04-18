# Task: 01-brand/003-config-rename

Find and replace all stale brand references in config files.

**Scope**: All `.json`, `.yml`, `.yaml` files under `packages/`

**Replacements**:
- Package names: `@converge/harness` → `@converge/core` (or similar)
- Script names: `build-crew` → `build-converge`
- Binary names in package.json `bin` fields
- Description fields mentioning "harness"
- Repository URLs if they reference old names

**Process**:
1. Run grep to find all occurrences in config files
2. Be careful with JSON — maintain valid syntax
3. Update package.json name, description, bin, scripts fields
4. Update any playbook.yml files outside `.converge/`
5. Write manifest to `.converge/standardize-state/brand/003-config.json`