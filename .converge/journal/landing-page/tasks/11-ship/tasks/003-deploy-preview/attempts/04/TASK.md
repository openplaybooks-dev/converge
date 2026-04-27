# Task: 11-ship/003-deploy-preview

# Deploy preview

Run `wrangler pages deploy` against a preview environment. Capture the
returned preview URL.

## Process

```bash
# Requires CF_API_TOKEN env var (Cloudflare API token with Pages: Edit permission)
# AND CF_ACCOUNT_ID
test -n "$CF_API_TOKEN" || { echo "CF_API_TOKEN not set — preview deploy requires it"; exit 1; }
test -n "$CF_ACCOUNT_ID" || { echo "CF_ACCOUNT_ID not set — preview deploy requires it"; exit 1; }

cd apps/landing
pnpm exec wrangler pages deploy ./dist \
  --project-name=converge-landing \
  --branch=preview \
  --commit-dirty=true \
  | tee /tmp/converge-deploy.log

# Extract the preview URL from wrangler's output
grep -oE 'https://[a-z0-9-]+\.converge-landing\.pages\.dev' /tmp/converge-deploy.log \
  | head -1 > apps/landing/.preview-deploy-url

cat apps/landing/.preview-deploy-url
```

## Banned

- Skipping the env-var checks. If `CF_API_TOKEN` isn't set, fail fast — don't try to deploy and produce a confusing error.
- Deploying to `--branch=main` from the playbook. Production deploys are intentionally manual (the launch checklist task lists the steps); the playbook only deploys to preview.
- Running `wrangler` without `--commit-dirty=true`. The repo will have uncommitted state after a fresh playbook run; that's expected.