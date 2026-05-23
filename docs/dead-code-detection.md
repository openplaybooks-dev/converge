# Dead Code Detection & Pruning System

## Overview

Automated dead code detection and visualization system for the Converge monorepo. Combines static analysis (Knip) with complexity metrics to identify low-value code for pruning.

## Quick Start

```bash
# Run full analysis (detection + complexity + visualization)
pnpm dead-code:analyze

# Open the interactive treemap
open dead-code-report.html

# Check if dead code exceeds threshold (for CI)
pnpm dead-code:check
```

## What Was Implemented

### 1. Detection Layer (Knip)
- **Tool**: Knip v6.14.2 - TypeScript monorepo-aware dead code detector
- **Configuration**: `.knip.json` - whitelists public API exports, ignores test files
- **Detects**: Unused files, unused exports, unused dependencies

### 2. Complexity Analysis
- **Script**: `scripts/analyze-complexity.mjs`
- **Metrics**: LoC, cyclomatic complexity, import depth, export count
- **Output**: `complexity-report.json`

### 3. Visualization
- **Script**: `scripts/generate-treemap.mjs`
- **Output**: `dead-code-report.html` - interactive D3.js treemap
- **Features**:
  - Size = LoC
  - Color = complexity (green → yellow → red)
  - Border = dead code indicator (thick red)
  - Hover tooltips with detailed metrics
  - Drill-down by package → directory → file

### 4. npm Scripts
- `pnpm dead-code:detect` - Run Knip analysis
- `pnpm dead-code:complexity` - Calculate complexity metrics
- `pnpm dead-code:viz` - Generate treemap visualization
- `pnpm dead-code:analyze` - Run all three steps
- `pnpm dead-code:check` - CI threshold check (fails if >10% dead code)

### 5. Baseline Metrics
- **Location**: `docs/metrics/dead-code-baseline.json`
- **Snapshot**: 2026-05-22
- **Findings**:
  - 564 total TypeScript files
  - 92,909 total LoC
  - 47 completely unused files (8.3%)
  - 40 unused exports across 26 files
  - Average complexity: 36.2
  - High complexity threshold (top 10%): 85

## Current State

### Dead Code Summary
- **Dead files**: 47 (8.3% of codebase)
- **Unused exports**: 40
- **Status**: ✅ Within 10% threshold (conservative)

### Top Dead Files
1. `packages/provider-benchmark/src/pricing/provider-pricing.ts`
2. `packages/swebench/src/cli/validate.ts`
3. `packages/core/src/ai/index.ts`
4. `packages/core/src/checkpoint/cleanup.ts`
5. `packages/core/src/executor/index.ts`

### Recommendations
1. **Immediate**: Review and remove 47 completely unused files (safe to delete)
2. **Short-term**: Audit 40 unused exports - may indicate over-exported API surface
3. **Medium-term**: Focus on high-complexity files (>85) with dead exports for maximum impact
4. **Ongoing**: Run weekly analysis to track progress and prevent regression

## How It Works

### Detection (Knip)
Knip analyzes the TypeScript AST to find:
- Files that are never imported
- Exports that are never used
- Dependencies that are never imported

Configuration in `.knip.json`:
- Whitelists all `packages/*/src/index.ts` exports (public API)
- Ignores test files (`*.test.ts`, `*.spec.ts`)
- Ignores examples and dist directories

### Complexity Analysis
Custom script using simple heuristics:
- **LoC**: Count non-blank, non-comment lines
- **Cyclomatic complexity**: Count decision points (if, for, while, case, &&, ||, ?, catch)
- **Import depth**: Count import statements
- **Export count**: Count export statements

### Visualization
D3.js treemap with:
- **Hierarchy**: monorepo → packages → files
- **Size encoding**: File LoC (larger = more code)
- **Color encoding**: Complexity (green = low, red = high)
- **Border encoding**: Dead code (thick red border = unused file)
- **Interactive**: Hover for details, click to drill down

## CI Integration (Future)

To add CI checks:

1. Create `.github/workflows/dead-code-check.yml`:
```yaml
name: Dead Code Check

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm dead-code:analyze
      - run: pnpm dead-code:check
```

2. Adjust threshold in `scripts/check-threshold.mjs` if needed

## Maintenance

### Weekly Analysis
```bash
# Generate fresh report
pnpm dead-code:analyze

# Compare with baseline
diff docs/metrics/dead-code-baseline.json <(jq '.summary' complexity-report.json)

# Update baseline if significant changes
cp complexity-report.json docs/metrics/dead-code-baseline.json
```

### Pruning Workflow
1. Run analysis: `pnpm dead-code:analyze`
2. Open `dead-code-report.html` in browser
3. Identify high-priority targets (dead files + high complexity)
4. Verify file is truly unused (check git history, search for dynamic imports)
5. Delete file and run tests: `pnpm test`
6. Commit with message: `chore: remove unused file <path>`
7. Re-run analysis to update metrics

## Files Created

```
.knip.json                              # Knip configuration
scripts/analyze-complexity.mjs          # Complexity analysis script
scripts/generate-treemap.mjs            # Visualization generator
scripts/check-threshold.mjs             # CI threshold checker
docs/metrics/dead-code-baseline.json    # Baseline metrics
dead-code-report.html                   # Generated visualization (gitignored)
complexity-report.json                  # Generated metrics (gitignored)
```

## Configuration

### Adjusting Threshold
Edit `scripts/check-threshold.mjs`:
```javascript
const THRESHOLD_PERCENT = 10; // Change to 5 for stricter, 15 for looser
```

### Whitelisting Files
Edit `.knip.json`:
```json
{
  "ignore": [
    "path/to/intentionally-unused-file.ts"
  ]
}
```

### Complexity Calculation
Edit `scripts/analyze-complexity.mjs`:
- Modify `calculateComplexity()` to adjust decision point weights
- Add new metrics (e.g., nesting depth, function length)

## Troubleshooting

### "No Knip data received on stdin"
Run `pnpm dead-code:detect` first to generate `/tmp/knip-output.json`

### "Could not load complexity report"
Run `pnpm dead-code:complexity` to generate `complexity-report.json`

### False positives
Add to `.knip.json` ignore list or whitelist specific exports

### Visualization not loading
Check browser console for errors. D3.js is loaded from CDN - requires internet connection.

## Next Steps

1. **Review dead files**: Manually verify the 47 unused files can be safely deleted
2. **Audit exports**: Review the 40 unused exports - some may be intentional public API
3. **CI integration**: Add GitHub Actions workflow to enforce threshold
4. **Weekly reports**: Set up cron job or reminder to run analysis
5. **Pruning sprint**: Dedicate time to remove dead code and reduce complexity

## References

- [Knip documentation](https://knip.dev/)
- [D3.js treemap](https://d3js.org/d3-hierarchy/treemap)
- [Cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
