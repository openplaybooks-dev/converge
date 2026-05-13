# Epoch 3 summary

## Mental model audited
- **Model:** Framework vs Project
- **Rule:** NEVER hardcode project specifics into the framework — framework (packages/) is generic, projects (examples/) are specific
- **Finding:** Project-specific example name 'cinematic-video-production' hardcoded in framework prompt templates across three files in packages/core/src/planning/
- **Severity:** high / Maintainability

## Correction
- **Test written:** tests/planning/prompt-templates.test.ts
- **Framework file changed:** packages/core/src/planning/progressive-decomposition/analyze.ts
- **Framework file changed:** packages/core/src/planning/progressive-decomposition/implement-executable.ts
- **Framework file changed:** packages/core/src/planning/progressive-decomposition/task-md-schema.ts
- **Change:** Replaced hardcoded example path 'examples/cinematic-video-production/' in prompt templates with a generic placeholder resolved at runtime from project configuration
- **Test-first:** yes, test failed before fix, passed after

## Verification
- **Result:** PASS
- **Build:** pass
- **Test:** pass

## Ledger updates
- Journal: appended
- Metrics: appended
- Touched files: appended
- Escalated: no

## Next epoch guidance
- **Continue auditing:** next un-audited mental model not in blocked or escalated lists
- **Already audited:** Blueprint vs Runtime (epoch 1), Checks Not Vibes (epoch 2), Framework vs Project (epoch 3)
- **Skip mental models:** Blueprint vs Runtime, Checks Not Vibes, Framework vs Project
- **Escalated bugs (do not retry):** select-parent-plus-missing-children (epochs 001-004), hooks-throw-timeout (epochs 002-004)
