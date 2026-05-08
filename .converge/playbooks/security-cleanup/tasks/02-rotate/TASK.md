---
title: Secret Rotation Checklist
dependencies:
  - audit
inputs:
  - .converge/security-cleanup/audit.json
outputs:
  - .converge/security-cleanup/rotation-checklist.md
checks:
  - id: checklist-exists
    cmd: test -f .converge/security-cleanup/rotation-checklist.md
    description: Rotation checklist file exists
  - id: checklist-covers-all-secrets
    cmd: |
      node -e "
      const audit = JSON.parse(require('fs').readFileSync('.converge/security-cleanup/audit.json','utf-8'));
      const md = require('fs').readFileSync('.converge/security-cleanup/rotation-checklist.md','utf-8');
      const providers = [...new Set(audit.secrets.map(s => s.provider))];
      let missing = 0;
      for (const p of providers) {
        if (!md.includes(p)) { console.log('Missing: ' + p); missing++; }
      }
      if (missing > 0) throw new Error(missing + ' providers not covered in checklist');
      console.log('All ' + providers.length + ' providers covered');
      "
    description: Every provider from the audit has a rotation step in the checklist
---

Produce a human-readable rotation checklist from the audit report.

Read `.converge/security-cleanup/audit.json`. For each unique provider/API key
found, write a step-by-step rotation instruction to
`.converge/security-cleanup/rotation-checklist.md`.

Provider rotation URLs:

| Provider | Rotation URL |
|---|---|
| deepseek | https://platform.deepseek.com/api_keys |
| minimax | https://platform.minimax.io/user-center/basic-information/interface-key |
| kimi / moonshot | https://platform.moonshot.cn/console/api-keys |
| gemini / google | https://console.cloud.google.com/apis/credentials |
| openai | https://platform.openai.com/api-keys |
| anthropic | https://console.anthropic.com/settings/keys |
| meshy | https://meshy.ai/dashboard/api |
| grok / xai | https://console.x.ai/ |
| kling | https://platform.klingai.com/ |

For each key:

1. Provider name and rotation URL
2. Key prefix (masked) from audit
3. List of files that reference it
4. Steps: (a) log in to provider dashboard, (b) create new key, (c) update
   referenced files with new key, (d) verify works, (e) delete old key

Add a warning at the top:
> **WARNING**: The keys listed below are compromised (committed to git history
> of a public repository). They must be rotated BEFORE the repository is
> made public or immediately if already public. Anyone with access to the
> git history can use these keys.

Add a final section "After Rotation" instructing the user to run Phase 3
(purge) to strip the old keys from the codebase.
