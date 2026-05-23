---
name: view-spec-writer
description: Methodology for writing industry-standard view specifications with source citations and state archetypes
---

# View Spec Writer Skill

## When to Use This Skill

Use this skill when creating detailed specifications for individual UI views. This is the blueprint that designers and engineers follow.

## Required Structure (80-200 lines)

```markdown
# [View Title]

<One-sentence purpose — what does the user accomplish here?>

## Sources
- Feature doc: docs/product/features/[epic-id]/[feature-id]/FEATURE.md § <section>
- Feature rationale: docs/product/features/[epic-id]/[feature-id]/META.md § <section>
- Design system: .design/system/DESIGN.md § <relevant sections>
- View definition: docs/product/features/[epic-id]/[feature-id]/views.json (includes sections/tabs/modals sub-catalogs)
- Component archetypes: .design/system/component-archetypes.html
- Shared CSS: .design/system/base.css, .design/system/components.css (imported by all views)

## Persona & Density
- Persona: [name from user-personas.md]
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
| Click "X" | confirmation | Confirm Action | Requires typed confirmation, then calls api.action(id) |

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
| Type in search | Debounced filter (300ms) | → Filtered list |

## State Archetypes
- **Default:** when <condition>, show <layout> with <data>
- **Empty:** when <condition>, show EmptyState with heading "…" and CTA "…"
- **Loading:** show SkeletonRow × N matching list layout (shimmer only ease animation)
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
- Loading: skeleton shimmer (only ease animation allowed)

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
4. **All state archetypes must be described** — even if not applicable, say so
5. **Design tokens referenced by name** — no raw hex values in the spec
6. **Interactions are specific** — "User clicks X, system does Y" not "User interacts with the form"
7. **80-200 lines** — comprehensive but not verbose

## Anti-Patterns

- No `Lorem ipsum`, `John Doe`, `Jane Doe`, `example.com`
- No round numbers (100, 1000, 10000) — use realistic values
- No banking-domain leftovers
- No "we could add X someday" — specs describe what exists
- No invented details — if it's not in the source docs, flag it as TBD
- No vague descriptions — "shows a list" → "shows 6-item list sorted by name ascending"
