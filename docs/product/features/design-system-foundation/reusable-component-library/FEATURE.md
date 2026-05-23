# Feature: Reusable Component Library

**Epic:** design-system-foundation
**Classification:** User-facing
**Priority:** Must (MVP)
**RICE:** Reach=100, Impact=3, Confidence=90%, Effort=8 → **Score: 3,375**

## Description

A library of core UI components built on the CSS design tokens, following semantic naming conventions and accessibility standards. Every component is a self-contained unit with consistent API, token-based styling, and built-in ARIA attributes.

## Component Inventory

### MVP Components

| Component | Variants | Key Props | Accessibility |
|---|---|---|---|
| **Button** | primary, secondary, tertiary, danger, ghost; sizes: sm, md, lg | `variant`, `size`, `disabled`, `loading`, `icon` | `role="button"`, `aria-disabled`, `aria-busy` |
| **Card** | default, elevated, bordered | `variant`, `padding`, `interactive` | `role="article"` or `role="region"`, `aria-labelledby` |
| **Input** | text, email, password, textarea, search | `type`, `label`, `placeholder`, `error`, `disabled`, `required` | `aria-label`, `aria-invalid`, `aria-describedby` |
| **Badge** | default, success, warning, error, info | `variant`, `dot` (boolean) | `role="status"` |
| **Avatar** | image, initials, icon; sizes: xs, sm, md, lg | `src`, `name`, `fallback`, `size` | `alt` text from `name` |
| **Modal/Dialog** | default, confirmation, fullscreen | `open`, `onClose`, `title`, `footer` | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap |
| **Toast/Alert** | success, warning, error, info; inline vs floating | `variant`, `message`, `action`, `dismissible`, `duration` | `role="alert"`, `aria-live="polite"` |
| **Navigation** | sidebar nav, top bar, breadcrumbs | `items`, `activeKey`, `collapsible` | `role="navigation"`, `aria-current="page"` |

### v2+ Components

- Data Table (sortable, filterable, paginated)
- Dropdown/Select (single, multi, searchable)
- Tooltip (directional, delayed)
- Tabs (horizontal, vertical)
- Accordion (single/multi expand)
- Skeleton loaders
- Complex form layouts with field groups and validation
- Timeline/feed card (Reddit-style post component)
- Comment thread (nested replies with indentation)

## Component API Convention

Every component follows this contract:

```tsx
// Consistent prop naming across all components
interface ComponentProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;     // for consumer overrides
  'aria-label'?: string;  // always supported
}
```

### Design Principles

1. **Token-only styling** — no hardcoded colors/sizes in component CSS
2. **Accessible by default** — ARIA attributes built in, not bolted on
3. **Composable** — components combine without conflict (Card + Avatar + Badge)
4. **Extensible** — `className` prop for consumer overrides, CSS custom properties for theme injection
5. **Framework-agnostic CSS** — component styles are plain CSS with BEM naming; framework bindings (React, etc.) are thin wrappers

## MVP Scope

- [ ] 8 core components (Button, Card, Input, Badge, Avatar, Modal, Toast, Navigation)
- [ ] Each component: at least 2 variants, responsive behavior, token-based styling
- [ ] Basic ARIA attributes on all interactive components
- [ ] Keyboard navigation for Modal (Escape to close, Tab trapping) and Navigation (arrow keys)
- [ ] Component CSS files with semantic naming (`c-button`, `c-card`, etc.)
- [ ] Index file (`components/index.ts`) for clean imports

## v2+ Scope

- Advanced components (Data Table, Tabs, Accordion, etc.)
- Form validation components (FieldError, FormGroup, validation summary)
- Skeleton loading states for every component
- Motion/animation variants (enter/exit transitions)
- Component composition patterns (compound components, render props)
- Framework-specific packages (React, Vue, vanilla JS bindings)

## Verification

- **Automated**: Component test suite — each component renders in all variant/size combos without error
- **Accessibility**: axe-core audit on component story pages — 0 violations
- **Visual**: Chromatic or snapshot tests for each component variant
- **Integration**: Feed card page (from timeline-feed-core epic) renders using only these components — no ad-hoc CSS

## Trade-offs

| Decision | Alternative | Why Chosen |
|---|---|---|
| Plain CSS + BEM naming | CSS Modules, styled-components, Tailwind | Simplest possible stack, no build tooling, works with any framework |
| 8 MVP components | Start with 3-4 | Enough to build the core feed page without gaps |
| Component CSS, not inline styles | CSS-in-JS | Better perf, debuggable in dev tools, cacheable |
| React as primary framework binding | Vue, Svelte, vanilla first | Matches project's existing stack; bindings are thin anyway |
