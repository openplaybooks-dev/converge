---
id: "{{taskId}}"
title: "Draft RFC body — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/draft/draft.md"
checks:
  - id: draft-or-skip-recorded
    cmd: "test -s {{artifactsRel}}/draft/draft.md || node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e '.decision != \"draft\"' {{artifactsRel}}/triage/triage.json"
    description: A draft exists, or triage decision short-circuited
  - id: draft-required-sections
    cmd: "test ! -s {{artifactsRel}}/draft/draft.md || (grep -q '^## Problem' {{artifactsRel}}/draft/draft.md && grep -q '^## Current behaviour' {{artifactsRel}}/draft/draft.md && grep -q '^## Proposal' {{artifactsRel}}/draft/draft.md && grep -q '^## Implementation steps' {{artifactsRel}}/draft/draft.md && grep -q '^## Test plan' {{artifactsRel}}/draft/draft.md)"
    description: Draft contains all required sections (skipped if short-circuited)
  - id: draft-frontmatter-valid
    cmd: "test ! -s {{artifactsRel}}/draft/draft.md || (head -30 {{artifactsRel}}/draft/draft.md | grep -q '^status: draft$' && head -30 {{artifactsRel}}/draft/draft.md | grep -q '^type:' && head -30 {{artifactsRel}}/draft/draft.md | grep -q '^priority_tier:' && head -30 {{artifactsRel}}/draft/draft.md | grep -q '^source:')"
    description: Draft frontmatter has required fields
  - id: breaking-has-migration-plan
    cmd: "test ! -s {{artifactsRel}}/draft/draft.md || ! grep -qE '^type: (breaking|deprecation)$' {{artifactsRel}}/draft/draft.md || grep -q '^migration_plan:' {{artifactsRel}}/draft/draft.md"
    description: Breaking and deprecation RFCs declare a migration_plan
  - id: deprecation-has-window
    cmd: "test ! -s {{artifactsRel}}/draft/draft.md || ! grep -q '^type: deprecation$' {{artifactsRel}}/draft/draft.md || grep -q '^deprecation_window:' {{artifactsRel}}/draft/draft.md"
    description: Deprecation RFCs declare a deprecation_window
  - id: feat-with-public-surface-cites-source
    cmd: "test ! -s {{artifactsRel}}/draft/draft.md || ! grep -q '^type: feat$' {{artifactsRel}}/draft/draft.md || ! grep -q '^breaks_existing: no$' {{artifactsRel}}/draft/draft.md || (grep -qE '^source: (issue#|idea:)' {{artifactsRel}}/draft/draft.md)"
    description: feat RFCs that add public surface cite a real issue or idea source
---

# Draft the RFC

Read `{{artifactsRel}}/triage/triage.json`. If `decision != "draft"`, write an
empty `{{artifactsRel}}/draft/draft.md` (0 bytes) and exit — the short-circuit
checks accept this case.

Otherwise, expand the candidate into a full RFC body that follows the
existing convention at `docs/rfcs/0001-cross-template-var-validator.md`.

## Frontmatter (required)

```yaml
---
title: <short imperative sentence>
status: draft
type: <fix|feat|deprecation|breaking|chore|refactor>
source: <issue#N|idea:docs/ideas/foo.md|backlog:<id>|code-finding:<hash>>
priority_tier: <critical|tier0|tier1|tier2|tier3>
estimate: <e.g. "1 day", "3-4 days", "1 week">
backwards_compatible: <yes|no>
risk: <low|medium|high>
# Conditional:
migration_plan: <one-line summary>   # REQUIRED for type: breaking | deprecation
deprecation_window: <e.g. "2 minor versions">   # REQUIRED for type: deprecation
breaks_existing: <yes|no>            # REQUIRED for type: feat that adds public surface
---
```

## Body sections (required, in order)

1. `# RFC: <title>` — heading
2. `## Problem` — the failure or gap, with concrete evidence (error messages,
   user reports, file:line refs to current code that demonstrates the issue)
3. `## Current behaviour` — what the code does today, with `path:line` refs
4. `## Proposal` — what changes
5. `## Code-level design` — TypeScript pseudocode or concrete patterns. May be
   stub-level for `type: chore` RFCs.
6. `## Implementation steps` — verifiable milestones, one per bullet
7. `## Test plan` — specific tests to add or modify, with `tests/<file>.test.ts`
   paths or shell commands
8. `## Out of scope` — explicit boundaries

## Special cases

- **`type: chore`**: minimal template allowed — `## Problem` + `## Fix` only.
  Skip Code-level design, Implementation steps, Test plan, Out of scope.
- **`type: feat` adding public surface**: include an `## Example usage` block
  showing how callers use the new API, plus `## Alternatives considered`
  naming at least two alternatives and why they were rejected.
- **`type: breaking`**: include `## Migration guide` section with step-by-step
  for existing callers.

## Citation discipline

Every `path:line` reference must point to a line that exists in HEAD right
now. The next task (05-cite-check) verifies this. If you cannot find a
specific line, write `path` (no `:line`) — but at least one `path:line`
citation is expected in the Problem and Current behaviour sections.

## Output

Write `{{artifactsRel}}/draft/draft.md` with the full RFC. Use a slug derived
from `triage.candidate.hash[:8]` for internal reference (the actual filename
is assigned by task 06).
