---
title: Lint and Format Verification
outputs:
  - .converge/standardize-state/quality/lint-report.json
checks:
  - id: lint-report-exists
    cmd: test -f .converge/standardize-state/quality/lint-report.json
    description: Lint report exists
  - id: lint-passes
    cmd: "node -e \"const r=JSON.parse(require('fs').readFileSync('.converge/standardize-state/quality/lint-report.json','utf-8'));if(r.errors>0)throw new Error(r.errors+' lint errors')\""
    description: No lint errors
---

Run linting and formatting across the codebase.

**Process**:

1. **Detect lint/format tools** — check package.json for:
   - ESLint, Biome, or similar linter
   - Prettier, Biome, or similar formatter
   - Any lint/format scripts in package.json

2. **Run linter**:
   - If ESLint: `npx eslint packages/ --ext .ts`
   - If Biome: `npx biome check packages/`
   - Record errors and warnings

3. **Run formatter**:
   - If Prettier: `npx prettier --check packages/`
   - If Biome: `npx biome format --check packages/`
   - Record files needing formatting

4. **Fix violations**:
   - Auto-fix what can be auto-fixed
   - Document remaining issues that need manual attention

5. **Write report** to `.converge/standardize-state/quality/lint-report.json`:
```json
{
  "linter": "eslint|biome|none",
  "formatter": "prettier|biome|none",
  "errors": 0,
  "warnings": 5,
  "autoFixed": 12,
  "manualFixNeeded": [],
  "filesChecked": 150
}
```
