---
id: view-design-{{epicId}}-{{featureId}}-{{viewId}}
title: Design Pipeline — {{viewTitle}}
description: Run 4-step design pipeline for view {{viewId}} in feature {{featureId}} of epic {{epicId}}
blocking: true
passthrough: true
vars:
  epicId:
  featureId:
  viewId:
  viewTitle:
  persona:
  priority:
  interactions:
  sections:
  tabs:
  modals:
inputs:
  - docs/product/features/{{epicId}}/{{featureId}}/FEATURE.md
  - docs/product/features/{{epicId}}/{{featureId}}/META.md
  - docs/product/features/{{epicId}}/{{featureId}}/views.json
  - .design/system/DESIGN.md
  - .design/system/tokens.json
  - .design/system/component-archetypes.html
  - .design/system/page-patterns.html
outputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css
checks:
  - id: spec-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
    description: View spec exists
  - id: meta-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md
    description: View META.md exists with design rationale
  - id: mockup-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html
    description: State-stacked mockup exists
  - id: design-html-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html
    description: Production HTML exists
  - id: design-css-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css
    description: Production CSS exists
  - id: design-uses-tokens
    cmd: python3 -c "
import re
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html').read()
assert re.search(r'var\(--\w', content), 'design.html does not reference tokens'
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css').read()
assert re.search(r'var\(--\w', content), 'design.css does not reference tokens'
"
    description: Both design files reference design system tokens
  - id: spec-has-required-sections
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md').read()
for section in ['## View Overview', '## Screen Sections', '## Interactions', '## State Archetypes']:
    assert section in content, f'Missing section: {section}'
"
    description: Spec has required sections
  - id: meta-has-rationale
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md').read()
for section in ['## Design Rationale', '## MVP Scope']:
    assert section in content, f'Missing section: {section}'
"
    description: META.md has rationale and MVP scope sections
skills:
  - view-spec-writer
  - view-meta-writer
  - html-mockup
---

# View Design Pipeline

Run the 4-step design pipeline for {{viewTitle}} in epic {{epicId}} / feature {{featureId}}.

## Static Children

This task has 4 static children that run sequentially:

1. **01-spec** — Writes industry-standard SPEC.md
2. **02-meta** — Writes META.md with design rationale and MVP scope
3. **03-mockup** — Creates state-stacked HTML mockup (all variants in one file)
4. **04-wire** — Produces production-ready design.html + design.css

## Context

- **View**: {{viewTitle}} (id: {{viewId}})
- **Epic**: {{epicId}}
- **Feature**: {{featureId}}
- **Target Persona**: {{persona}}
- **Priority**: {{priority}}
- **Sections**: {{sections}} (from views.json sub-catalog)
- **Tabs**: {{tabs}} (from views.json sub-catalog)
- **Modals**: {{modals}} (from views.json sub-catalog)
- **Key Interactions**: {{interactions}}

## Design Rules

- All CSS must use `var(--...)` tokens from `.design/system/tokens.css`
- **Import shared CSS**: All mockup.html and design.html must link `base.css` and `components.css` before view-specific `design.css`
- **design.css is layout-only**: Do NOT redefine buttons, cards, forms, modals, badges, etc. — those come from `components.css`. Do NOT redefine reset, typography, spacing utilities — those come from `base.css`.
- Reference `.design/system/component-archetypes.html` for component rendering patterns
- Reference `.design/system/page-patterns.html` for layout patterns
- Reference `views.json` sections for the screen's sub-structure
- No emoji, no placeholder images, no Lorem Ipsum
- Phosphor icons as inline SVG
- Domain-specific realistic content
- State-stacked mockup.html shows: default, empty, loading, error variants

## Traceability

Every artifact must reference:
- Epic: {{epicId}}
- Feature: {{featureId}}
- View: {{viewId}}
- Feature META.md: `docs/product/features/{{epicId}}/{{featureId}}/META.md`
- Design system: `.design/system/DESIGN.md`
