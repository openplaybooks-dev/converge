# Needs: 11-ship/001-wrangler-config

## Inputs

- `apps/landing/.verify-passed`

## Expected Outputs

- `apps/landing/wrangler.toml`

## Checks

- **verify-passed-exists**: phase 10 verify-passed marker exists (deploy gate)
- **wrangler-toml-exists**: wrangler.toml exists
- **wrangler-has-project-name**: project name is converge-landing
- **wrangler-has-output-dir**: pages_build_output_dir is set
