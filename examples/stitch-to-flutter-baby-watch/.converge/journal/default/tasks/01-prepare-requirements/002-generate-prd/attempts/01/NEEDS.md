# Needs: 01-prepare-requirements/002-generate-prd

## Description

Generate Product Requirements Document from idea.md

## Inputs

- `idea.md`

## Expected Outputs

- `PRD.md`

## Checks

- **prd-exists**: PRD.md exists
- **prd-has-sections**: PRD.md has expected sections
- **prd-matches-idea**: PRD.md references the app name from idea.md
