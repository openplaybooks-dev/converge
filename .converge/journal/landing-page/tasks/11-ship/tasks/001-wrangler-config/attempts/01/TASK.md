# Task: 11-ship/001-wrangler-config

# wrangler.toml

```toml
name = "converge-landing"
compatibility_date = "2026-04-26"
pages_build_output_dir = "./dist"

[vars]
ENVIRONMENT = "production"

[observability]
enabled = true
```

## Process

1. Verify `apps/landing/.verify-passed` exists (the deploy gate). If it doesn't, refuse — phase 10 hasn't passed.
2. Write `apps/landing/wrangler.toml` as shown.
3. The `compatibility_date` should be set to today's date (or recent) — Cloudflare uses it to pin runtime behavior.

## Banned

- Setting `name` to anything but `converge-landing`. The project name is the deploy URL prefix; don't change it without updating DNS.
- Hardcoding secrets in `[vars]`. Real secrets go in Cloudflare Pages dashboard env settings, not the toml.