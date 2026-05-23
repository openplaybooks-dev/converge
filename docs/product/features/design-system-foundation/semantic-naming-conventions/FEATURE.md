# Feature: Semantic Naming Conventions

**Epic:** design-system-foundation
**Classification:** System-level
**Priority:** Must (MVP)
**RICE:** Reach=100, Impact=2, Confidence=90%, Effort=1 → **Score: 18,000**

## Description

A BEM-inspired naming strategy for CSS classes, component-scoped identifiers, and token reference patterns. Ensures every selector in the codebase is predictable, searchable, and collision-free. This is the lowest-effort, highest-leverage feature in the epic — it costs almost nothing to adopt but prevents years of CSS debt.

## Naming Architecture

### Block.Component.Element__Modifier (BCEM)

A pragmatic BEM variant optimized for component-based architectures:

```css
/* Block: component-level, prefixed with c- */
.c-button { }
.c-card { }
.c-modal { }

/* Element: structural part of a component, double-underscore */
.c-button__icon { }
.c-card__header { }
.c-card__footer { }
.c-modal__overlay { }
.c-modal__body { }

/* Modifier: variant/state, double-dash */
.c-button--primary { }
.c-button--loading { }
.c-card--elevated { }
.c-modal--fullscreen { }

/* Utility: single-purpose, prefixed with u- */
.u-visually-hidden { }
.u-flex-center { }
.u-truncate { }

/* Layout: page/section structure, prefixed with l- */
.l-page { }
.l-sidebar { }
.l-feed { }
.l-feed__item { }

/* State: JS-driven state changes, prefixed with is- */
.is-open { }
.is-active { }
.is-disabled { }
.is-loading { }

/* Token references: use var(), prefixed with -- for CSS custom properties */
/* (tokens live in :root, referenced by components) */
```

### Naming Rules

1. **No generic class names** — `.container`, `.wrapper`, `.box` are banned
2. **No style-based names** — `.blue-button`, `.big-card` are banned (use modifiers: `.c-button--primary`)
3. **One block per file** — each `.css` file defines one component's styles
4. **State classes are never styled directly** — they augment block/element styles
5. **Utility classes are atomic** — one CSS property per utility class

## File Structure

```
src/styles/
├── tokens.css          # CSS custom properties
├── resets.css          # CSS reset / normalize
├── utilities.css       # u- classes
├── layout.css          # l- classes
└── components/
    ├── c-button.css
    ├── c-card.css
    ├── c-modal.css
    └── ...
```

## MVP Scope

- [ ] Naming convention document (this file)
- [ ] CSS lint config (Stylelint or equivalent) enforcing BCEM naming
- [ ] All MVP components follow the naming convention
- [ ] Utility classes for common patterns (visually-hidden, flex helpers, truncate)
- [ ] Layout classes for the feed/page structure

## v2+ Scope

- Automated naming audit tooling (CI check for violations)
- IDE extension/autocomplete for class names
- Migration scripts for any legacy CSS that predates this convention
- CSS architecture decision record (ADR) documenting the naming strategy

## Verification

- **Automated**: Stylelint config rejects any class name not matching `c-*`, `u-*`, `l-*`, `is-*`, or `*-block__element--modifier` patterns
- **Manual**: `grep -r "\.[a-z]\+-[a-z]" src/styles/ | grep -v "c-\|u-\|l-\|is-"` returns empty
- **Review**: PR review checklist includes "CSS class names follow BCEM convention"

## Trade-offs

| Decision | Alternative | Why Chosen |
|---|---|---|
| BCEM (BEM variant) | CSS Modules, CSS-in-JS scoped styles | Works with plain CSS files, no build step, explicit and searchable |
| `c-` / `u-` / `l-` / `is-` prefixes | No prefixes | Instantly identifies class purpose; prevents collisions with third-party CSS |
| Stylelint enforcement | Manual code review | Catches violations before they merge; zero effort after setup |
| Atomic utilities | Utility-first framework (Tailwind) | Lighter weight, only the utilities we need, no purge step |
