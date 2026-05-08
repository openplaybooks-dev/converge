---
title: Comprehensive Security Audit
outputs:
  - .converge/security-cleanup/audit.json
checks:
  - id: audit-exists
    cmd: test -f .converge/security-cleanup/audit.json
    description: Audit report file exists
  - id: audit-is-valid-json
    cmd: node -e "const a=JSON.parse(require('fs').readFileSync('.converge/security-cleanup/audit.json','utf-8'));if(!a.secrets||!a.trackedEnvFiles||!a.largeFiles)throw new Error('Missing required fields')"
    description: Audit JSON has all required fields (secrets, trackedEnvFiles, largeFiles)
  - id: audit-has-summary
    cmd: node -e "const a=JSON.parse(require('fs').readFileSync('.converge/security-cleanup/audit.json','utf-8'));console.log('Secrets: '+a.secrets.length+', .env files: '+a.trackedEnvFiles.length+', Large files: '+a.largeFiles.length)"
    description: Print summary counts
---

Run `scripts/audit.js` to scan the entire repository for:

1. **API keys and secrets** — patterns: `sk-`, `sk-proj-`, `sk-api-`, `sk-cp-`,
   `AIza`, `msy_`, `xai-`, `AFDhg`, `YmF8e` in all git-tracked files
2. **Tracked .env files** — `git ls-files | grep '\.env'`
3. **Large files** — files > 100KB in git (`git ls-files -s | awk '$4 > 100000'`)
4. **Build artifacts** — `.next/`, `.wrangler/`, `.astro/` directories in git
5. **Hardcoded paths** — `/Users/` references in tracked files
6. **Missing .gitignore patterns** — `.local-backup`, `.local`, build caches
7. **Internal API endpoints** — provider base URLs in config files
8. **Pre-commit hook status** — whether `.git/hooks/pre-commit` exists

Run:
```bash
node .converge/playbooks/security-cleanup/tasks/01-audit/scripts/audit.cjs
```

The script writes `.converge/security-cleanup/audit.json` with all findings.
Review the report before proceeding to Phase 2.
