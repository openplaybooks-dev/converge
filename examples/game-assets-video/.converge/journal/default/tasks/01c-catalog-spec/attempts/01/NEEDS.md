# Needs: 01c-catalog-spec

## Description

Decompose project intent into a canonical catalog declaring per-prop animation_type, keyframes_id, and tile families.

## Expected Outputs

- `assets/catalog.json`

## Checks

- **catalog-exists**: assets/catalog.json was written
- **catalog-props-have-animation-type**: Every shared prop in catalog has animation_type set to static / loop / trigger
