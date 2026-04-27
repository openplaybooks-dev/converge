---
id: 018-secrets-scan
title: Scan playbook tasks for hardcoded secrets
outputs:
  - packages/converge-studio/src/app/api/playbooks/[name]/secrets-scan
  - packages/converge-studio/src/lib/secrets-scan.ts
  - packages/converge-studio/src/components/secrets-scan-card.tsx
checks:
  - id: scan-lib-exists
    description: Secrets scan library exists
    cmd: "test -f packages/converge-studio/src/lib/secrets-scan.ts"
  - id: scan-api-exists
    description: /api/playbooks/[name]/secrets-scan returns findings
    cmd: "test -f 'packages/converge-studio/src/app/api/playbooks/[name]/secrets-scan/route.ts'"
  - id: card-component-exists
    description: SecretsScanCard component exists
    cmd: "test -f packages/converge-studio/src/components/secrets-scan-card.tsx"
  - id: typecheck-passes
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Best-effort scan that flags obviously hardcoded secrets in playbook task files. Not a security tool — it's a "you probably didn't mean to commit this" reminder. Pattern-based, not contextual.

**Add `src/lib/secrets-scan.ts`:**

```ts
export interface SecretFinding {
  taskPath: string
  line: number
  pattern: string
  preview: string
}

export function scanText(text: string, taskPath: string): SecretFinding[]
export function scanPlaybook(playbook: string): Promise<SecretFinding[]>
```

Pattern set (keep it tight — false positives are worse than false negatives for this UI):
- AWS access key id: `AKIA[0-9A-Z]{16}`
- AWS secret key: `(?i)aws(.{0,20})?(secret|private)(.{0,20})?[=:][^=:]{40}`
- GitHub PAT: `ghp_[A-Za-z0-9]{36}` and `github_pat_[A-Za-z0-9_]{82}`
- Generic high-entropy assignment: `(?i)(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{16,}['"]`
- Private key headers: `-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----`

Walk all `TASK.md` files under the playbook (use `converge-adapter/tasks.ts::listTasks`), apply each pattern line-by-line, return findings with line numbers and a 60-char preview (with the matched substring redacted to `***`).

**Add `src/app/api/playbooks/[name]/secrets-scan/route.ts`:**
- `GET` returns `{ findings: SecretFinding[], scannedFiles: number, durationMs: number }`. Cache for 30 s per playbook (filesystem mtime check is fine).

**Add `src/components/secrets-scan-card.tsx`** (server component):
- Renders nothing if findings is empty.
- Otherwise: a yellow warning card with the count, a list (taskPath:line · pattern · redacted preview), and a "Dismiss" button that sets a localStorage flag per playbook (so users can mute it after acknowledging).

**Wire it in:** add `<SecretsScanCard playbook={name} />` to `src/app/playbooks/[name]/page.tsx` near the top of the detail page. The card is invisible when there's nothing to flag, so it doesn't cost vertical space in the common case.

**Verification:**
- Add a fake secret to a task file: `echo 'AWS_SECRET_ACCESS_KEY="AKIAIOSFODNN7EXAMPLE"' >> .converge/playbooks/implement-studio/tasks/01-vendor/TASK.md`. Reload the playbook detail page — the card appears.
- Remove the line; the card disappears within 30 s (cache window).
- The preview is redacted (the `AKIA...` portion shows as `***`).
