---
id: 02-meta
title: View META — {{viewTitle}}
description: Write META.md with design rationale and MVP scope for view {{viewId}}
blocking: true
depends_on:
  - 01-spec
inputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
  - docs/product/features/{{epicId}}/{{featureId}}/META.md
  - docs/product/features/{{epicId}}/{{featureId}}/FEATURE.md
outputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md
checks:
  - id: meta-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md
    description: META.md exists
  - id: meta-has-rationale
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md').read()
for section in ['## Design Rationale', '## MVP Scope', '## Trade-offs', '## Traceability']:
    assert section in content, f'Missing section: {section}'
"
    description: META.md has all required sections
  - id: meta-no-generic-content
    cmd: '! grep -qiE "lorem ipsum|john doe|jane doe" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md'
    description: No generic placeholder content
skills:
  - view-meta-writer
---

# View META — Design Rationale

Write the "why" document for {{viewTitle}} (view {{viewId}}) in epic {{epicId}} / feature {{featureId}}.

## Purpose

This META.md captures the reasoning behind every design decision for this view. It answers:
- Why this layout and not another?
- Why these components?
- Why this interaction pattern?
- What's in the MVP vs deferred?
- What trade-offs were made?

## Required Structure

```markdown
# META — {{viewTitle}}

## Design Rationale

### Why this layout?
- **User need:** [from FEATURE.md and research]
- **Competitive precedent:** [how similar products handle this]
- **Decision:** [what we chose and why]

### Why these components?
- **From DESIGN.md:** [which component archetypes apply]
- **Alternatives considered:** [what other patterns we rejected]
- **Final choice:** [why this set of components]

### Why this interaction pattern?
- **User goal:** [what the user is trying to accomplish]
- **Friction points:** [where users typically get stuck]
- **Resolution:** [how our design addresses friction]

### Why this information hierarchy?
- **Primary content:** [what users need to see first]
- **Secondary content:** [what users can discover]
- **Tertiary content:** [what's available on demand]

## MVP Scope

### In this MVP
- [Capability A]: [what it does, why it's essential]
- [Capability B]: [what it does, why it's essential]

### Deferred (v2+)
- [Capability C]: [why deferred, what's needed to implement]
- [Capability D]: [why deferred, what's needed to implement]

### Explicitly Out of Scope
- [What we're NOT building and why]

## Trade-offs

### Trade-off 1: [Name]
- **Option A:** [pros/cons]
- **Option B:** [pros/cons]
- **Decision:** [what we chose and why]

### Trade-off 2: [Name]
- [Same format]

## Assumptions & Risks

### Assumptions
- [Assumption 1]: [why we believe this]
- [Assumption 2]: [why we believe this]

### Risks
- [Risk 1]: [likelihood × impact]
  - **Mitigation:** [how we'll handle it]
- [Risk 2]: [likelihood × impact]
  - **Mitigation:** [how we'll handle it]

## Traceability
- **Epic:** {{epicId}}
- **Feature:** {{featureId}}
- **View:** {{viewId}}
- **Persona:** {{persona}}
- **Feature rationale:** docs/product/features/{{epicId}}/{{featureId}}/META.md § [section]
- **Design system:** .design/system/DESIGN.md § [section]
- **SPEC.md:** .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
```

## Rules

1. **Every decision must have reasoning** — no "because I said so"
2. **Trade-offs must be explicit** — show what was considered and rejected
3. **MVP scope must be honest** — clearly separate essential from nice-to-have
4. **Cite sources** — reference the research, feature docs, or design system that informed each decision
5. **Domain-specific** — use realistic examples, never generic placeholders

## Output

Write `.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md` with all sections completed.
