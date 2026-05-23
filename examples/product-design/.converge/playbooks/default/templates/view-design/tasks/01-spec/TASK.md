---
id: 01-spec
title: View Spec — {{viewTitle}}
description: Write industry-standard specification for view {{viewId}}
blocking: true
inputs:
  - docs/product/features/{{epicId}}/{{featureId}}/FEATURE.md
  - docs/product/features/{{epicId}}/{{featureId}}/META.md
  - docs/product/features/{{epicId}}/{{featureId}}/views.json
  - .design/system/DESIGN.md
  - .design/system/component-archetypes.html
outputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
checks:
  - id: spec-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
    description: Spec file exists
  - id: spec-min-length
    cmd: wc -l < .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md | xargs -I{} test {} -ge 80
    description: Spec is at least 80 lines
  - id: spec-has-required-sections
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md').read()
required = ['## View Overview', '## Sources', '## Persona & Density', '## Screen Sections', '## Interactions', '## State Archetypes', '## Design Tokens Referenced']
for s in required:
    assert s in content, f'Missing section: {s}'
"
    description: All required sections present
  - id: spec-cites-sources
    cmd: grep -q "## Sources" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md && grep -qE "(DESIGN.md|META.md|FEATURE.md)" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
    description: Spec cites source documents
  - id: no-generic-content
    cmd: '! grep -qiE "lorem ipsum|john doe|jane doe|example\.com" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md'
    description: No generic placeholder content
skills:
  - view-spec-writer
---

# View Specification

Write a comprehensive, industry-standard design specification for {{viewTitle}} (view {{viewId}}) in epic {{epicId}} / feature {{featureId}}.

## Required Structure (80-200 lines)

```markdown
# {{viewTitle}}

<One-sentence purpose — what does the user accomplish here?>

## Sources
- Feature doc: docs/product/features/{{epicId}}/{{featureId}}/FEATURE.md § <section>
- Feature rationale: docs/product/features/{{epicId}}/{{featureId}}/META.md § <section>
- Design system: .design/system/DESIGN.md § <relevant sections>
- View definition: docs/product/features/{{epicId}}/{{featureId}}/views.json

## Persona & Density
- Persona: {{persona}}
- Density: <compact|comfortable|spacious> (justification: cites DESIGN.md)
- Device context: <mobile-first|desktop-primary|responsive>

## Screen Sections
1. <Section name>
   - Purpose: …
   - Layout: …
   - Components: <list from DESIGN.md component archetypes>
   - Data fields: <list>
2. …

## Tabs (if any)
| Tab | Content | URL sync |
|---|---|---|
| [Tab name] | [what renders] | yes/no |

## Modals & Dialogs
| Trigger | Type | Title | Behavior |
|---|---|---|---|
| Click "X" | confirmation | Confirm Action | Requires typed confirmation |

## Buttons & Actions
| Button | Location | Behavior |
|---|---|---|
| Primary CTA | Header | Navigates to … |

## Links & Navigation
| Link | Destination | Behavior |
|---|---|---|
| Breadcrumb | Parent screen | Navigate back |

## Interactions
| Trigger | Outcome | State Change |
|---|---|---|
| Click "Submit" | Validates form, saves, shows toast | → Success state |
| Type in search | Debounced filter | → Filtered list |

## State Archetypes
- **Default:** when <condition>, show <layout> with <data>
- **Empty:** when <condition>, show EmptyState with heading "…" and CTA "…"
- **Loading:** show SkeletonRow × N matching list layout
- **Error:** show ErrorBoundary fallback with retry action
- **Success:** show confirmation message, auto-redirect after N seconds

## Design Tokens Referenced
- Background: `var(--color-bg-…)` = #...
- Primary: `var(--color-primary-…)` = #...
- Typography: `var(--text-…)` = …
- Spacing: `var(--space-…)` = …
- Radius: `var(--radius-…)` = …

## Example Data
<Realistic domain-specific values. No Lorem Ipsum, no generic names, no round numbers like 100/1000.>

## Motion
- Hover: `{ type: "spring", stiffness: 280, damping: 22 }`
- Page transition: `{ type: "spring", stiffness: 100, damping: 20 }`
- Loading: skeleton shimmer (only ease animation)

## Accessibility
- Tab order: <sequence>
- Focus-visible rings on every interactive element
- Screen reader landmarks: <roles, labels>
- Color contrast: all combinations meet WCAG 2.1 AA
- Keyboard-only navigation: <describe>
```

## Rules

1. **Every claim cites a source** — DESIGN.md, META.md, FEATURE.md, or views.json
2. **No generic content** — use realistic domain-specific examples
3. **If a detail isn't documented**, write `[TBD — not specified]` and do NOT invent
4. **All state archetypes must be described** — even if a state doesn't apply, say "Not applicable"
5. **Design tokens referenced by name** — no raw hex values in the spec

## Output

Write `.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md` with all sections completed.
