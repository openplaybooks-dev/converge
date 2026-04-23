---
id: 005-security-scan
title: Pre-release security scan
dependencies:
  - 003-npm-config
outputs:
  - .converge/standardize-state/oss/security-scan.json
checks:
  - id: security-scan-exists
    description: Security scan report exists
    cmd: test -f .converge/standardize-state/oss/security-scan.json
---

Run a pre-release security audit.

**Checks**:
1. `npm audit` — check for known vulnerabilities in dependencies
2. **No secrets in code** — grep for API keys, tokens, passwords:
   ```bash
   grep -ri 'sk-\|api_key\|secret\|password\|token' --include='*.ts' --include='*.js' packages/ | grep -v node_modules | grep -v test | grep -v '.d.ts'
   ```
3. **No .env files committed** — check git history
4. **SECURITY.md** — verify it has responsible disclosure instructions
5. **License compliance** — verify all dependencies have compatible licenses

**Write report** to `.converge/standardize-state/oss/security-scan.json`:
```json
{
  "npmAudit": { "vulnerabilities": 0, "details": [] },
  "secretsScan": { "found": 0, "details": [] },
  "envFiles": { "committed": false },
  "securityMd": { "exists": true, "hasDisclosure": true },
  "licenseCompliance": { "compatible": true, "issues": [] }
}
```

Fix any critical or high-severity issues found.
