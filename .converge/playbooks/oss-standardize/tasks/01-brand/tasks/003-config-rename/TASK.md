---
id: 003-config-rename
title: Rename harness→converge in config files
dependencies:
  - 002-docs-rename
outputs:
  - .converge/standardize-state/brand/003-config.json
checks:
  - id: no-harness-in-config
    description: No harness references in config files
    cmd: "test -z \"$(grep -ri 'harness' --include='*.json' --include='*.yml' --include='*.yaml' packages/ 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v package-lock)\""
---

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
