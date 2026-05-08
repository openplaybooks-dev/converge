---
title: Final Verification
dependencies:
  - harden
outputs:
  - .converge/security-cleanup/verification-report.json
checks:
  - id: verification-exists
    cmd: test -f .converge/security-cleanup/verification-report.json
    description: Verification report file exists
  - id: audit-is-clean
    cmd: |
      node .converge/playbooks/security-cleanup/tasks/01-audit/scripts/audit.cjs 2>&1 | grep -q "CLEAN" || {
        echo "Audit is NOT clean — issues remain"
        exit 1
      }
    description: Full re-audit confirms zero findings
  - id: all-gates-passed
    cmd: |
      node -e "
      const v = JSON.parse(require('fs').readFileSync('.converge/security-cleanup/verification-report.json','utf-8'));
      const failed = [];
      if (!v.gates.noSecrets) failed.push('noSecrets');
      if (!v.gates.noTrackedEnv) failed.push('noTrackedEnv');
      if (!v.gates.noBuildArtifacts) failed.push('noBuildArtifacts');
      if (!v.gates.noLargeFiles) failed.push('noLargeFiles');
      if (!v.gates.gitignoreHardened) failed.push('gitignoreHardened');
      if (!v.gates.precommitInstalled) failed.push('precommitInstalled');
      if (!v.gates.ciWorkflowExists) failed.push('ciWorkflowExists');
      if (failed.length > 0) throw new Error('Gates failed: ' + failed.join(', '));
      console.log('All gates passed');
      "
    description: All verification gates pass
---

This is the acceptance gate — re-run the audit and confirm zero findings.

### Gates

Each gate is a binary pass/fail. All must pass:

| Gate | Check | How |
|---|---|---|
| `noSecrets` | Zero API keys in tracked files | Re-run `scripts/audit.js` |
| `noTrackedEnv` | Zero tracked .env files | `git ls-files \| grep '\.env'` |
| `noBuildArtifacts` | Zero .next/.wrangler/.astro in git | `git ls-files` grep |
| `noLargeFiles` | Zero large brand PNGs tracked | `git ls-files \| grep 'assets/brand/explorations'` |
| `noLocalPaths` | Zero /Users/ paths in tracked configs | grep audit |
| `gitignoreHardened` | .gitignore covers .local-backup, .wrangler/, .next/ | grep .gitignore |
| `precommitInstalled` | Pre-commit hook exists and is executable | `test -x .git/hooks/pre-commit` |
| `ciWorkflowExists` | Secret scan CI workflow exists | `test -f .github/workflows/secret-scan.yml` |

### Run

```bash
# Re-run the audit scanner
node .converge/playbooks/security-cleanup/tasks/01-audit/scripts/audit.cjs

# Check pre-commit hook
test -x .git/hooks/pre-commit && echo "PASS: pre-commit" || echo "FAIL: pre-commit"

# Check CI workflow
test -f .github/workflows/secret-scan.yml && echo "PASS: CI" || echo "FAIL: CI"

# Check gitignore patterns
grep -q '\.local-backup' .gitignore && echo "PASS: gitignore" || echo "FAIL: gitignore"
```

Write the verification report to `.converge/security-cleanup/verification-report.json`:

```json
{
  "timestamp": "ISO-8601",
  "overallResult": "PASS | FAIL",
  "gates": {
    "noSecrets": true,
    "noTrackedEnv": true,
    "noBuildArtifacts": true,
    "noLargeFiles": true,
    "noLocalPaths": true,
    "gitignoreHardened": true,
    "precommitInstalled": true,
    "ciWorkflowExists": true
  },
  "details": {
    "secretsFound": 0,
    "envFilesTracked": 0,
    "buildArtifactsTracked": 0,
    "largeFilesTracked": 0,
    "localPathsFound": 0
  }
}
```

If any gate fails, fix the issue in the relevant phase and re-verify until all gates pass.
