# Feature: Accessibility Standards

**Epic:** design-system-foundation
**Classification:** System-level
**Priority:** Must (MVP)
**RICE:** Reach=100, Impact=3, Confidence=95%, Effort=5 → **Score: 5,700**

## Description

WCAG 2.1 AA compliance baked into every component from day one. Not an audit bolted on later — accessibility is a first-class constraint in component design. Covers ARIA roles/states/properties, keyboard navigation, focus management, color contrast, and screen reader compatibility.

## Accessibility Requirements

### ARIA Implementation

| Component | ARIA Pattern | Details |
|---|---|---|
| **Button** | `role="button"` (native `<button>`), `aria-disabled`, `aria-busy` | Use native `<button>` always; `aria-busy` when loading |
| **Card** | `role="article"` or `role="region"`, `aria-labelledby` | Labelled by heading or title text |
| **Input** | `aria-label` or `aria-labelledby`, `aria-invalid`, `aria-describedby`, `aria-required` | Error messages linked via `aria-describedby` |
| **Modal** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby` | Focus trap, return focus on close |
| **Toast** | `role="status"` or `role="alert"`, `aria-live` | `polite` for info, `assertive` for errors |
| **Navigation** | `role="navigation"`, `aria-current="page"` | Active link marked with `aria-current` |
| **Badge** | `role="status"` (for state badges) | Decorative badges use `aria-hidden` |
| **Avatar** | `alt` text from name prop | Image avatars require `alt`; initials use `aria-label` |

### Keyboard Navigation

| Interaction | Keys | Behavior |
|---|---|---|
| Tab order | `Tab` / `Shift+Tab` | Logical focus order matches visual order |
| Modal | `Escape` | Closes modal, returns focus to trigger |
| Modal | `Tab` | Traps focus within modal content |
| Navigation | `Arrow Up/Down` or `Arrow Left/Right` | Moves focus between nav items |
| Button | `Enter` / `Space` | Activates button (native `<button>` handles this) |
| Toast | `Escape` | Dismisses toast |
| Dropdown (v2) | `Arrow Up/Down`, `Enter`, `Escape` | Navigate options, select, close |

### Focus Management

- **Visible focus indicators** — 2px outline with `--color-primary-500` offset by 2px (`outline: 2px solid var(--color-primary-500); outline-offset: 2px;`)
- **Focus trapping** — Modal and Dialog components trap focus within their boundaries
- **Focus restoration** — Closing a modal returns focus to the element that opened it
- **Skip links** — "Skip to main content" link at top of page (visible on focus)
- **No focus loss** — Dynamic content updates don't steal or lose focus unexpectedly

### Color & Contrast

- **Minimum contrast**: 4.5:1 for normal text, 3:1 for large text (WCAG AA)
- **Color is never the sole indicator** — error states include icons/text, not just red color
- **Dark mode contrast** — all token variants meet contrast ratios in both themes
- **Color blindness safe** — palette tested against protanopia, deuteranopia, tritanopia simulators

### Screen Reader Support

- Semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<form>`) over `<div>` + ARIA
- `aria-live` regions for dynamic content (toasts, form validation messages)
- `aria-hidden="true"` on decorative elements (icons that duplicate text meaning)
- Tested with NVDA (Windows) and VoiceOver (macOS/iOS)

## MVP Scope

- [ ] ARIA attributes on all 8 MVP components
- [ ] Keyboard navigation for Modal (focus trap, Escape close), Navigation (arrow keys), Button (Enter/Space)
- [ ] Visible focus indicators on all interactive elements
- [ ] Color contrast audit — all text/background combos pass 4.5:1
- [ ] `aria-live` regions for Toast notifications
- [ ] Skip-to-content link
- [ ] Screen reader testing on core user flows (view feed, open modal, submit form, dismiss toast)

## v2+ Scope

- Full WCAG 2.1 AA automated audit (axe-core CI integration)
- Reduced motion preference support (`@media (prefers-reduced-motion)`)
- High-contrast theme variant
- Screen reader regression test suite
- Accessibility statement page
- Keyboard shortcut reference / cheat sheet
- Focus visible polyfill for older browsers

## Verification

- **Automated**: `axe-core` audit on component showcase page — 0 critical/serious violations
- **Automated**: Contrast checker script verifies all token combos meet 4.5:1 ratio
- **Manual**: Keyboard-only navigation through feed → modal → form → toast flow works end-to-end
- **Manual**: VoiceOver reads all component labels, states, and dynamic updates correctly
- **Manual**: Focus indicator visible on every tab stop

## Trade-offs

| Decision | Alternative | Why Chosen |
|---|---|---|
| WCAG 2.1 AA | WCAG 2.1 AAA | AA is the legal/industry standard; AAA is aspirational for some patterns |
| Built-in from day one | Audit and fix later | Retroactive a11y is 3-5x more expensive and creates inconsistent patterns |
| Native HTML elements | Custom elements with full ARIA | Native elements have built-in keyboard/screen reader support |
| Focus trapping in Modal | No focus trap | Required for WCAG; prevents keyboard users from tabbing behind overlay |
