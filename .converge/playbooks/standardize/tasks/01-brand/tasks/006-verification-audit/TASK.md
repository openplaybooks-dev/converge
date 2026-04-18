---
id: 006-verification-audit
title: Final brand verification audit
dependencies:
  - 005-cli-rename
outputs:
  - .converge/standardize-state/brand/006-audit.json
checks:
  - id: audit-clean
    description: Audit confirms zero stale references
    cmd: "node -e \"const a=JSON.parse(require('fs').readFileSync('.converge/standardize-state/brand/006-audit.json','utf-8'));if(a.staleReferences>0)throw new Error(a.staleReferences+' stale refs remain')\""
---

Run a comprehensive grep audit across the entire codebase to verify
zero stale brand references remain.

**Full scan**:
```bash
# Scan everything (excluding node_modules, .git, CHANGELOG, .converge/, auto-verify)
grep -ri 'harness' --include='*.ts' --include='*.md' --include='*.json' --include='*.yml' --include='*.yaml' . | grep -v node_modules | grep -v '.git/' | grep -v CHANGELOG | grep -v '.converge/' | grep -v auto-verify
grep -ri 'crew\|crewadd\|sheetsrun' --include='*.ts' --include='*.md' --include='*.json' . | grep -v node_modules | grep -v '.git/' | grep -v CHANGELOG | grep -v '.converge/'
```

**Write audit report** to `.converge/standardize-state/brand/006-audit.json`:
```json
{
  "timestamp": "ISO-8601",
  "staleReferences": 0,
  "scannedFiles": 500,
  "patterns": ["harness", "crew", "crewadd", "sheetsrun"],
  "exceptions": [
    { "file": "path", "reason": "auto-verify internal module" }
  ],
  "remaining": []
}
```

If any stale references are found, fix them before writing the audit report.
The audit must report `staleReferences: 0` to pass.
