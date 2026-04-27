---
id: 001-wrangler-config
title: wrangler.toml for Cloudflare Pages
inputs:
  - apps/landing/.verify-passed
outputs:
  - apps/landing/wrangler.toml
checks:
  - id: verify-passed-exists
    cmd: "test -f apps/landing/.verify-passed"
    description: phase 10 verify-passed marker exists (deploy gate)
  - id: wrangler-toml-exists
    cmd: "test -f apps/landing/wrangler.toml"
    description: wrangler.toml exists
  - id: wrangler-has-project-name
    cmd: "test -f apps/landing/wrangler.toml && grep -qE \"name\\s*=\\s*['\\\"]converge-landing['\\\"]\" apps/landing/wrangler.toml"
    description: project name is converge-landing
  - id: wrangler-has-output-dir
    cmd: "test -f apps/landing/wrangler.toml && grep -qE \"pages_build_output_dir\\s*=\" apps/landing/wrangler.toml"
    description: pages_build_output_dir is set
---

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
