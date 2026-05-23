# META: Design System Foundation

**Epic ID:** design-system-foundation
**Status:** Documented
**Last Updated:** 2026-05-23

## Overview

The Design System Foundation epic provides the styling, component, accessibility, and documentation infrastructure that every other UI epic depends on. It is the "must-have" foundation — without it, each screen duplicates styles, creates inconsistent UX, and accumulates maintenance debt from day one.

## Feature Summary

| # | Feature | Classification | Priority | RICE Score | MVP? |
|---|---|---|---|---|---|
| 1 | [CSS Design Tokens](csscss-design-tokens/) | System-level | Must | 9,500 | ✅ |
| 2 | [Reusable Component Library](reusable-component-library/) | User-facing | Must | 3,375 | ✅ |
| 3 | [Semantic Naming Conventions](semantic-naming-conventions/) | System-level | Must | 18,000 | ✅ |
| 4 | [Accessibility Standards](accessibility-standards/) | System-level | Must | 5,700 | ✅ |
| 5 | [Theme Customization System](theme-customization-system/) | User-facing | Should | 1,200 | ✅ |
| 6 | [Component Documentation](component-documentation/) | Administrative | Should | 2,833 | ✅ |

## RICE Analysis Summary

**Highest RICE: Semantic Naming Conventions (18,000)** — reaches everyone who touches CSS, has high confidence (naming is uncontroversial), and costs almost nothing (a document + lint config).

**Second Highest: CSS Design Tokens (9,500)** — consumed by every component, high confidence (industry standard with Material Design 3 precedent), moderate effort (define tokens, no component logic).

**Third Highest: Accessibility Standards (5,700)** — reaches all users, highest impact (legal + UX necessity), highest confidence (WCAG spec is definitive), moderate effort (built into components from start).

**Fourth: Component Documentation (2,833)** — reaches all developers consuming the system, moderate impact (enables self-service), moderate effort (writing, not coding).

**Fifth: Reusable Component Library (3,375)** — reaches all users who see the UI, highest impact (direct UX), but lower score due to high effort (8+ components to build, test, and maintain).

**Sixth: Theme Customization System (1,200)** — reaches only users who care about themes (developer persona primarily), moderate impact, moderate effort. Scored lower because dark mode is already partially covered by the token architecture (just `data-theme` attribute swap).

## Prioritization Rationale

### Must (MVP)
All four "must" features are non-negotiable for a design system to function:
- **Tokens** — without tokens, there's no single source of truth for visual primitives
- **Components** — without components, every screen reinvents the wheel
- **Naming** — without naming conventions, CSS becomes unsearchable and unmanageable within weeks
- **Accessibility** — without a11y, the product excludes users and creates retrofit debt

### Should (MVP but lower priority)
- **Theme System** — the architecture (CSS custom properties + `data-theme`) makes dark mode cheap; the toggle UI is a nice-to-have that improves developer experience
- **Documentation** — components work without docs, but docs multiply developer velocity. Markdown docs are low effort; interactive playgrounds are not

### Won't (for MVP)
- Custom palette editor UI
- Interactive component playground (Storybook)
- Automated token generation pipeline
- Visual regression testing
- High-contrast theme variant
- Per-user theme profiles

These are deferred to v2+ because they require significant additional effort and the MVP can ship without them.

## MVP vs v2+ Split

### MVP (Ship Together)
The MVP is a functional design system that a developer can use to build the Reddit-style timeline feed:
- Tokens provide the visual vocabulary
- Components provide the building blocks
- Naming conventions keep the CSS maintainable
- Accessibility is baked in, not bolted on
- Dark mode works via `data-theme` attribute
- Docs exist as markdown files alongside components

**Verification criteria for MVP done:**
1. A developer can build the timeline feed page using only components, tokens, and docs — zero ad-hoc CSS
2. All 8 components pass axe-core audit with 0 critical/serious violations
3. All CSS class names follow BCEM naming convention (lint-enforced)
4. Dark mode toggle works, persists, respects OS preference
5. Component docs exist for all 8 MVP components

### v2+ (Future Iterations)
- Interactive playground for component development
- Custom theme editor for non-developers
- Additional components (Data Table, Tabs, Accordion, etc.)
- Automated accessibility audit pipeline
- Visual regression testing
- Token JSON source with build pipeline
- Per-user theme profiles

## View Patterns

### Documentation Views (3 MVP views)
| View | Route | Purpose |
|---|---|---|
| Component Index | `/docs/components` | List all components with previews |
| Single Component Doc | `/docs/components/:name` | Per-component reference |
| Token Reference | `/docs/tokens` | Visual token showcase |

### Developer Tool Views (2 MVP views)
| View | Route | Purpose |
|---|---|---|
| Component Showcase | `/components` | All variants rendered for verification |
| Accessibility Audit Dashboard | `/dev/a11y` | v2: Automated a11y test results |

### User-Facing Views (Implicit)
The design system has no dedicated user-facing "pages" — instead, every page in the application (feed, settings, plan detail, etc.) is built from these system primitives. The **theme toggle** is the only visible UI element this epic ships directly.

### Global Behaviors (Not Route-Based)
- Skip-to-content link (all pages)
- Focus indicators (all interactive elements)
- Theme persistence (localStorage, all pages)
- `data-theme` attribute cascade (all pages)

## How This Epic Enables All Other UI Epics

### timeline-feed-core
- Uses `Card` component for each feed item
- Uses `Avatar` for user/task icons
- Uses `Badge` for status indicators
- Uses `Button` for actions (expand, vote, comment)
- All styled via design tokens
- All accessible per WCAG standards

### right-rail-controls
- Uses `Button`, `Navigation`, and `Input` components
- Uses `Modal` for confirmation dialogs
- Uses `Toast` for action feedback
- All keyboard-navigable

### future epics (plan-detail, settings, etc.)
- Will compose from the same component library
- Will inherit dark mode automatically
- Will follow the same naming conventions
- Will be documented in the same docs site
- Will meet the same accessibility bar

### The Multiplicative Effect
Every UI epic after this one has **lower effort** because:
1. They don't write CSS from scratch — they consume tokens
2. They don't build UI elements — they compose components
3. They don't figure out a11y — it's baked in
4. They don't invent naming — the convention is set
5. They don't write docs from scratch — the template exists

**This is the highest-leverage epic in the entire product.** Its RICE scores reflect that: even the lowest-scoring feature (Theme System at 1,200) delivers more value-per-effort than most standalone features because it's consumed by everything built on top of it.

## Trade-Offs & Risks

### Trade-Off: Plain CSS over CSS-in-JS
**Risk:** May feel primitive to developers used to styled-components.
**Mitigation:** The component library can have React bindings that wrap the CSS. The CSS itself remains framework-agnostic.

### Trade-Off: Built-in a11y over post-hoc audit
**Risk:** Slows initial component development by ~30%.
**Mitigation:** This is intentional — retrofitting a11y is 3-5x more expensive. The slowdown is front-loaded and pays off immediately in the next epic.

### Trade-Off: Markdown docs over interactive playground
**Risk:** Docs may become stale if not maintained.
**Mitigation:** CI check validates every component has a doc entry. v2 playground adds interactivity.

### Risk: Token proliferation
**Risk:** Too many tokens become unmaintainable (the opposite of the goal).
**Mitigation:** Token count capped at ~80 for MVP. New tokens require design review. Stylelint prevents hardcoded values from sneaking in.

### Risk: Component library scope creep
**Risk:** "Just one more component" delays the feed page.
**Mitigation:** MVP is exactly 8 components. New components go in v2. The feed page is the forcing function that proves the library is sufficient.
