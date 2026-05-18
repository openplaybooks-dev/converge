---
id: 003-npm-config
title: Audit npm publish configuration
dependencies:
  - 001-community-health
outputs:
  - .converge/standardize-state/oss/npm-audit.json
checks:
  - id: npm-audit-exists
    description: npm audit report exists
    cmd: test -f .converge/standardize-state/oss/npm-audit.json
---

Audit all package.json files for npm publishing readiness.

**For each package** in the monorepo, verify:
1. `name` — uses correct scope and naming (no "harness" references)
2. `version` — semantic versioning, appropriate for first public release
3. `description` — accurate, mentions Converge
4. `license` — "Apache-2.0"
5. `repository` — correct GitHub URL
6. `homepage` — set (or will be set)
7. `keywords` — relevant search terms
8. `files` or `.npmignore` — only published files included (no tests, no docs, no .converge/)
9. `main`, `types`, `exports` — correct entry points
10. `engines` — minimum Node.js version specified
11. `publishConfig` — access: public (for scoped packages)

**Write report** to `.converge/standardize-state/oss/npm-audit.json`:
```json
{
  "packages": [
    {
      "name": "@openplaybooks/converge-core",
      "path": "packages/core",
      "ready": true,
      "issues": []
    }
  ],
  "fixes": ["description of fixes applied"]
}
```

Fix any issues found — don't just report them.
