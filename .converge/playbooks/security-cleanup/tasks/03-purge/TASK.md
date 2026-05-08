---
title: Purge Secrets from Codebase
dependencies:
  - rotate
inputs:
  - .converge/security-cleanup/audit.json
outputs:
  - .converge/security-cleanup/purge-log.json
checks:
  - id: purge-log-exists
    cmd: test -f .converge/security-cleanup/purge-log.json
    description: Purge log file exists
  - id: no-secrets-remain-in-tracked
    cmd: |
      node .converge/playbooks/security-cleanup/tasks/01-audit/scripts/audit.js 2>&1 | grep -q "CLEAN" || {
        echo "Secrets still found in tracked files — purge incomplete"
        exit 1
      }
    description: Re-run audit scan confirms zero secrets in tracked files
  - id: no-dotenv-tracked
    cmd: "test -z \"$(git ls-files | grep -E '\\.env$|\\.env\\.local-backup$')\""
    description: No .env or .env.local-backup files tracked by git
---

Remove all secrets from the working tree. Run `scripts/purge.js`:

```bash
node .converge/playbooks/security-cleanup/tasks/03-purge/scripts/purge.cjs
```

The script does NOT rewrite git history (that's a separate, destructive
operation requiring user confirmation). It operates on the working tree:

1. **Replace hardcoded keys in source files** with `${PROVIDER_API_KEY}`
   or `YOUR_API_KEY_HERE` placeholders
2. **Replace keys in project configs** with `${ENV_VAR}` references
3. **`git rm --cached`** tracked `.env` files
4. **Create `.env.example` templates** where `.env` files were removed
5. **Remove hardcoded local paths** from settings files

After this task completes successfully, the working tree will have:
- Zero API keys in tracked files
- Zero tracked `.env` files
- `.env.example` templates for users to copy

The `purge-log.json` records every replacement made for auditability.
