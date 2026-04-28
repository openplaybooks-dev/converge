# Needs: 04-registry-build

## Description

Auto-derive assets/REGISTRY.json from on-disk shared assets. Scenes reference the registry to reuse rather than regenerate.

## Expected Outputs

- `assets/REGISTRY.json`

## Checks

- **registry-exists**: REGISTRY.json was written
- **registry-has-shape**: REGISTRY.json has characters[] and shared_props[]
