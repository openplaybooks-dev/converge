# Feature: Theme Customization System

**Epic:** design-system-foundation
**Classification:** User-facing
**Priority:** Should (MVP)
**RICE:** Reach=30, Impact=2, Confidence=80%, Effort=4 → **Score: 1,200**

## Description

Light/dark mode toggle with system-preference detection, theme persistence across sessions (localStorage), and a mechanism for injecting custom color palettes by overriding CSS token values. Makes the design system adaptable rather than rigid.

## Architecture

### Theme Switching Mechanism

```
User preference flow:
1. Check localStorage for saved theme → use if found
2. Fall back to prefers-color-scheme media query → use system preference
3. Fall back to light theme as default

Theme application:
- document.documentElement.setAttribute('data-theme', 'dark' | 'light')
- All CSS custom properties re-resolve via cascade
- No component re-render needed (CSS-only)
- Transition: smooth opacity crossfade on color properties
```

### Theme Toggle Component

A small Button variant placed in the header/nav:

```html
<button class="c-button c-button--ghost c-button--sm" 
        id="theme-toggle" 
        aria-label="Switch to dark mode">
  <span class="c-button__icon" aria-hidden="true">🌙</span>
</button>
```

### Custom Theme Injection (v2)

For white-label or brand-specific deployments:

```css
:root[data-custom-theme="acme"] {
  --color-primary-500: #e91e63;  /* override default */
  --color-primary-900: #880e4f;
  --font-family-base: 'Roboto', sans-serif;
}
```

## MVP Scope

- [ ] Light theme (default) with full token set
- [ ] Dark theme with token overrides (`[data-theme="dark"]`)
- [ ] System preference detection (`prefers-color-scheme`)
- [ ] Theme persistence via localStorage
- [ ] Theme toggle component in navigation
- [ ] Smooth theme transition (CSS `transition` on `background-color`, `color`)

## v2+ Scope

- Custom palette editor UI (Priya persona — non-developer theme configuration)
- Brand theming for white-label deployments (custom `data-custom-theme` values)
- Per-user theme profiles (tied to user accounts, not just localStorage)
- Animated theme transitions (CSS transitions for all color properties)
- Theme preview mode (see how changes look before applying)
- Accessibility contrast warnings in custom theme editor

## Verification

- **Manual**: Toggle theme → all surfaces change, no layout shift, transition is smooth
- **Manual**: Reload page → theme persists
- **Manual**: Set OS to dark mode → app matches on first load (no localStorage)
- **Automated**: CSS test verifies all semantic tokens have both light and dark values
- **Manual**: Theme toggle component is keyboard-navigable and screen-reader announced

## Trade-offs

| Decision | Alternative | Why Chosen |
|---|---|---|
| `data-theme` attribute on `<html>` | Class on `<body>`, separate CSS files | Attribute is cascade-friendly, works with CSS custom properties natively |
| localStorage persistence | Cookie, URL param, server-side | Simplest, no server dependency, survives page reload |
| CSS-only transitions | JS-driven theme transitions | Zero JS overhead, smoother, works even if JS fails |
| Two themes (light/dark) for MVP | One theme only | Dark mode is expected by developer persona; cheap to add with token architecture |
