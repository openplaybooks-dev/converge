# Needs: 01-vendor/003-license-notice

## Expected Outputs

- `packages/converge-studio/LICENSE`
- `packages/converge-studio/LICENSE.upstream`
- `packages/converge-studio/NOTICE`
- `packages/converge-studio/README.md`

## Checks

- **upstream-license-preserved**: LICENSE.upstream is the original Mission Control LICENSE
- **notice-attribution**: NOTICE file mentions builderz-labs/mission-control and includes upstream SHA
- **studio-license-mit**: Root LICENSE is MIT
- **readme-mentions-fork**: README.md documents the fork lineage
